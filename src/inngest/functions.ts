import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent, createTool, createNetwork, type Tool, type Message, createState, gemini } from "@inngest/agent-kit";
//
import { prisma } from "@/lib/db";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";

import { inngest } from "./client";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox, parseAgentOutput, lastAssistantTextMessageContent } from "./utils";

function geminiVertexKey(modelName: string) {
  // Use the API key from your environment variable
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY! || process.env.GEMINI_API_KEY!;

  const baseModel = gemini({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: modelName as any,
    apiKey: apiKey,
    // This perfectly matches your working curl:
    // It creates: https://aiplatform.googleapis.com/v1/publishers/google/models/{modelName}:generateContent?key={apiKey}
    baseUrl: "https://aiplatform.googleapis.com/v1/publishers/google/",
  });

  const originalOnCall = baseModel.onCall;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseModel.onCall = (options, body: any) => {
    if (originalOnCall) {
      originalOnCall(options, body);
    }

    // Gemini 3 preview models enforce cryptographic thoughtSignatures on all past function calls.
    // Inngest agent-kit drops these signatures when formatting generic messages.
    // To bypass the 400 ERROR, we flatten all historical function calls into conversational text.
    if (body.contents) {
      for (const content of body.contents) {
        if (content.parts) {
          for (const part of content.parts) {
            if (part.functionCall) {
              part.text = `[Used tool: ${part.functionCall.name} with args: ${JSON.stringify(part.functionCall.args)}]`;
              delete part.functionCall;
            }
            if (part.functionResponse) {
              part.text = `[Tool ${part.functionResponse.name} returned: ${JSON.stringify(part.functionResponse.response)}]`;
              delete part.functionResponse;
            }
          }
        }
      }
    }
  };

  return baseModel;
}

interface AgentState {
  summary: string;
  files: { [path: string]: string };
};

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const project = await step.run("get-project", async () => {
      return await prisma.project.findUnique({
        where: { id: event.data.projectId }
      });
    });

    const sandboxId = await step.run("get-sandbox-id", async () => {
      let sandbox;
      if (project?.sandboxId) {
        try {
          sandbox = await Sandbox.connect(project.sandboxId);
        } catch {
          console.log("Existing sandbox expired, creating new one.");
        }
      }

      if (!sandbox) {
        sandbox = await Sandbox.create("vibe-reactjs-test");
        await sandbox.setTimeout(SANDBOX_TIMEOUT);

        await prisma.project.update({
          where: { id: event.data.projectId },
          data: { sandboxId: sandbox.sandboxId }
        });
      }

      return sandbox.sandboxId;
    });

    const latestFragment = await step.run("get-latest-fragment", async () => {
      const messageWithFragment = await prisma.message.findFirst({
        where: {
          projectId: event.data.projectId,
          fragment: { isNot: null }
        },
        orderBy: { createdAt: "desc" },
        include: { fragment: true }
      });

      if (!messageWithFragment?.fragment) {
        console.log("DEBUG: No previous fragment found — this is a first run or all prior runs failed.");
        return null;
      }

      return messageWithFragment.fragment;
    });

    await step.run("hydrate-sandbox", async () => {
      // Skip hydration if there are no previous files (first run or prior failure).
      // An empty files object {} means nothing useful to seed.
      const filesObj = latestFragment?.files as Record<string, string> | undefined;
      const hasFiles = filesObj && typeof filesObj === "object" && Object.keys(filesObj).length > 0;

      if (!hasFiles) {
        console.log("DEBUG: Skipping hydration — no previous files to seed into sandbox.");
        return null;
      }

      const sandbox = await getSandbox(sandboxId);
      let written = 0;
      for (const [path, content] of Object.entries(filesObj)) {
        if (typeof content === "string") {
          try {
            await sandbox.files.write(path, content);
            written++;
          } catch (e) {
            console.error(`Failed to hydrate file ${path}`, e);
          }
        }
      }
      console.log(`DEBUG: Hydrated ${written} files into sandbox.`);
    });

    const previousMessages = await step.run("get-previous-messages", async () => {
      const formattedMessages: Message[] = [];

      const messages = await prisma.message.findMany({
        where: {
          projectId: event.data.projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      for (const message of messages) {
        formattedMessages.push({
          type: "text",
          role: message.role === "ASSISTANT" ? "assistant" : "user",
          content: message.content,
        })
      }

      return formattedMessages.reverse();
    });

    let initialFiles = {};
    if (latestFragment && latestFragment.files && typeof latestFragment.files === "object") {
      initialFiles = latestFragment.files;
    }

    const state = createState<AgentState>(
      {
        summary: "",
        files: initialFiles as Record<string, string>,
      },
      {
        messages: previousMessages,
      },
    );

    // Generate a truly unique runId for this specific execution to prevent Inngest
    // AUTOMATIC_PARALLEL_INDEXING step ID collisions if the user clicks "Run" multiple times.
    const runId = event.data.projectId.slice(0, 4);

    // Factory function: creates an agent with unique name and step IDs per attempt.
    const createCodeAgentForAttempt = (attemptIndex: number) => {
      return createAgent<AgentState>({
        name: `code-agent-run-${runId}-attempt-${attemptIndex}`,
        description: "An expert coding agent",
        system: PROMPT,
        // Using 1.5-pro-002 for the highest reliability in tool-calling.
        // gemini-2.5-flash-lite often produces MALFORMED_FUNCTION_CALL.
        model: geminiVertexKey("gemini-3-flash-preview"),
        tools: [
          createTool({
            name: "terminal",
            description: "Use the terminal to run commands",
            parameters: z.object({
              command: z.string(),
            }),
            handler: async ({ command }, { step }) => {
              return await step?.run(`terminal-run-${runId}-attempt-${attemptIndex}`, async () => {
                const buffers = { stdout: "", stderr: "" };
                try {
                  const sandbox = await getSandbox(sandboxId);
                  const result = await sandbox.commands.run(
                    `yes 2>/dev/null | (${command})`,
                    {
                      timeoutMs: 0,
                      onStdout: (data: string) => { buffers.stdout += data; },
                      onStderr: (data: string) => { buffers.stderr += data; },
                    }
                  );
                  return result.stdout || "(done, no output)";
                } catch (e) {
                  return `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
                }
              });
            },
          }),
          createTool({
            name: "createOrUpdateFiles",
            description: "Create or update files in the sandbox",
            parameters: z.object({
              files: z.array(z.object({ path: z.string(), content: z.string() })),
            }),
            handler: async ({ files }, { network }: Tool.Options<AgentState>) => {
              try {
                const updatedFiles: Record<string, string> = {};
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  await sandbox.commands.run(`touch "${file.path}"`); // Forces inotify event
                  updatedFiles[file.path] = file.content;
                }
                network.state.data.files = {
                  ...(network.state.data.files || {}),
                  ...updatedFiles,
                };
                return `Successfully updated files`;
              } catch (e) {
                return "Error: " + e;
              }
            },
          }),
          createTool({
            name: "readFiles",
            description: "Read files from the sandbox",
            parameters: z.object({
              files: z.array(z.string()),
            }),
            handler: async ({ files }, { step }) => {
              return await step?.run(`readFiles-run-${runId}-attempt-${attemptIndex}`, async () => {
                try {
                  const sandbox = await getSandbox(sandboxId);
                  const contents = [];
                  for (const file of files) {
                    const content = await sandbox.files.read(file);
                    contents.push({ path: file, content });
                  }
                  return JSON.stringify(contents);
                } catch (e) {
                  return "Error: " + e;
                }
              });
            },
          }),
        ],
        lifecycle: {
          onResponse: async ({ result, network }) => {
            console.log('aryan lifecycle,', result, network?.state.data)
            const lastAssistantMessageText = lastAssistantTextMessageContent(result);
            if (lastAssistantMessageText && network) {
              if (lastAssistantMessageText.includes("<task_summary>")) {
                network.state.data.summary = lastAssistantMessageText;
              }
            }
            return result;
          },
        },
      });
    };

    let isBuildSuccessful = false;
    const maxRetries = 5; // Give the AI up to 5 chances to self-heal the build
    let attempt = 0;
    let currentPrompt = event.data.value; // Starts with the user's initial prompt
    let finalSummary = "";
    let finalFiles = state.data.files;

    // --- THE SELF-HEALING LOOP ---
    while (!isBuildSuccessful && attempt <= maxRetries) {
      // Create a uniquely named agent and network for this attempt.
      const currentCodeAgent = createCodeAgentForAttempt(attempt);
      const attemptNetwork = createNetwork<AgentState>({
        name: `coding-agent-network-run-${runId}-attempt-${attempt}`,
        agents: [currentCodeAgent],
        maxIter: 5,
        defaultState: state,
        router: async ({ network }) => {
          const summary = network.state.data.summary;
          console.log("DEBUG: Summary:", summary);
          if (summary) return;
          return currentCodeAgent;
        },
      });
      console.log('Im here here here', attempt, event.data, currentPrompt)
      // 1. Let the AI generate or fix the code.
      // NOTE: network.run() must NOT be wrapped in step.run() — agent-kit tools
      // internally call step?.run() themselves, and nesting steps deadlocks Inngest.
      const result = await attemptNetwork.run(
        attempt === 0 ? event.data.value : currentPrompt,
        { state }
      );

      finalSummary = result.state.data.summary || "";
      finalFiles = result.state.data.files;

      // Guard: if AI returned nothing useful, don't retry — break out.
      if (!finalSummary) {
        console.error("DEBUG: AI returned no summary. Breaking loop to avoid infinite retry.");
        finalSummary = "Task completed.";
        break;
      }

      // 2. Verify the build in an isolated step
      const buildCheck = await step.run(`verify-build-run-${runId}-attempt-${attempt}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          console.log(`DEBUG: Running build check (Run ${runId}, Attempt ${attempt})...`);

          await sandbox.commands.run("rm -rf dist");

          // Suppress npm version notices. Vite/tsc errors always go to stdout.
          const buildResult = await sandbox.commands.run("npm run build --silent 2>&1");

          console.log('build result lol', buildResult);

          // Double-check output for known error markers (some failures exit 0)
          const combinedOutput = (buildResult.stdout || "") + "\n" + (buildResult.stderr || "");
          const hasError = combinedOutput.includes("error TS") || combinedOutput.includes("Build failed");

          if (hasError) return { success: false, error: combinedOutput.trim() };
          return { success: true, error: "" };

        } catch (buildErr: unknown) {
          const err = buildErr as { stderr?: string; stdout?: string; message?: string };

          // Vite/tsc errors go to stdout — stderr only has npm notices
          const rawOutput = (err.stdout || "") + "\n" + (err.stderr || "") || err.message || "Unknown build error";

          const errorLog = rawOutput
            .split("\n")
            .filter((line: string) => !line.trim().startsWith("npm notice") && !line.trim().startsWith("npm warn"))
            .join("\n")
            .trim();

          console.error("DEBUG: Build failed:", errorLog.substring(0, 800));
          return { success: false, error: errorLog || "Build failed with unknown error." };
        }
      });

      if (buildCheck.success) {
        isBuildSuccessful = true;
      } else {
        attempt++;
        if (attempt <= maxRetries) {
          console.log(`DEBUG: Feeding error back to AI for fix (Attempt ${attempt})...`);

          if (!buildCheck.error || buildCheck.error.length < 10) {
            console.error("DEBUG: Build error was empty after filtering. Treating as success.");
            isBuildSuccessful = true;
            break;
          }

          // Pass the raw error to the AI and let it reason through the fix
          currentPrompt = `The React Vite build failed. Here is the exact error output:\n\n${buildCheck.error}\n\nAnalyze the error, fix the affected files using the createOrUpdateFiles or terminal tool, then reply with <task_summary> when done.`;

          // CRITICAL: Clear the summary so the router doesn't skip the fix step
          state.data.summary = "";
        }
      }
    }

    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: geminiVertexKey("gemini-3-flash-preview"),
    })

    const responseGenerator = createAgent({
      name: "response-generator",
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: geminiVertexKey("gemini-3-flash-preview"),
    });


    const {
      output: fragmentTitleOutput
    } = await fragmentTitleGenerator.run(finalSummary);
    const {
      output: responseOutput
    } = await responseGenerator.run(finalSummary);

    const deploymentUrl = await step.run("deploy-to-cloudflare", async () => {
      // If the AI failed to fix the code after max retries, abort the deployment
      if (!isBuildSuccessful) {
        console.error("DEBUG: AI failed to fix the build after max retries. Aborting Cloudflare deploy.");
        return null;
      }

      try {
        const sandbox = await getSandbox(sandboxId);

        console.log("DEBUG: Zipping dist folder...");
        // Guarantee zip is installed so it doesn't crash here
        await sandbox.commands.run("sudo apt-get update && sudo apt-get install -y zip");
        await sandbox.commands.run("cd dist && zip -r ../dist.zip .");

        const cfToken = process.env.CLOUDFLARE_API_TOKEN;
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) return null;

        const projectName = `vibe-${event.data.projectId.substring(0, 15)}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

        await sandbox.commands.run(`curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json" -d '{"name":"${projectName}","production_branch":"main"}'`);

        const uploadResult = await sandbox.commands.run(`curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${projectName}/deployments" -H "Authorization: Bearer ${cfToken}" -F "file=@dist.zip"`);

        const deploymentData = JSON.parse(uploadResult.stdout);

        if (deploymentData.success) {
          console.log("DEBUG: Cloudflare Deploy successful!");
          return `https://${projectName}.pages.dev`;
        } else {
          console.error("DEBUG: Cloudflare deploy failed:", deploymentData.errors);
          return null;
        }
      } catch (e) {
        console.error("DEBUG: Cloudflare Deploy infra err:", e);
        return null;
      }
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);

      // 1. Terminate any existing processes blocking port 3000 (prevents EADDRINUSE on rapid successive runs)
      await sandbox.commands.run("kill -9 $(lsof -t -i:3000) 2>/dev/null || true");

      // 2. Start the Vite server in the background
      await sandbox.commands.run("npm run dev -- --host 0.0.0.0 --port 3000", { background: true });

      // 3. Robustly poll locally until the server is awake and accepting traffic
      // This eliminates the race condition where the UI renders the URL before Vite has bound the port.
      await sandbox.commands.run(`
        for i in {1..20}; do
          if curl -s http://localhost:3000 >/dev/null; then
            exit 0
          fi
          sleep 0.5
        done
        exit 1
      `);

      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput) || finalSummary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              deploymentUrl: deploymentUrl,
              title: parseAgentOutput(fragmentTitleOutput) || "Project Updated",
              files: finalFiles || {},
            },
          },
        },
      });
    });

    return {
      url: deploymentUrl || sandboxUrl,
      deploymentUrl: deploymentUrl,
      sandboxUrl: sandboxUrl,
      title: "Fragment",
      files: finalFiles,
      summary: finalSummary,
    };
  },
);
