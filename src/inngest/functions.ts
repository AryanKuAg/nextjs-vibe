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
        sandbox = await Sandbox.create("vibe-nextjs-test-2");
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

    // Removed OAuth Service Account fetching entirely because the curl works with a standard API key!

    const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: geminiVertexKey("gemini-3.1-flash-lite-preview"),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                const sandbox = await getSandbox(sandboxId);
                // timeoutMs: 0 disables the E2B deadline entirely so long-running
                // commands (npm install, builds, etc.) never get killed mid-flight.
                // We wrap the command with `yes |` to auto-answer any interactive
                // prompts (e.g. "overwrite? y/N") so the AI never hangs.
                const result = await sandbox.commands.run(
                  `yes 2>/dev/null | (${command})`,
                  {
                    timeoutMs: 0,
                    onStdout: (data: string) => {
                      buffers.stdout += data;
                    },
                    onStderr: (data: string) => {
                      buffers.stderr += data;
                    }
                  }
                );
                return result.stdout || "(done, no output)";
              } catch (e) {
                console.error(
                  `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderror: ${buffers.stderr}`,
                );
                return `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),
          handler: async (
            { files },
            { network }: Tool.Options<AgentState>
          ) => {
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
                ...updatedFiles
              };
              return `Successfully updated files`;
            } catch (e) {
              return "Error: " + e;
            }
          }
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
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
            })
          },
        })
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;

        if (summary) {
          return;
        }

        return codeAgent;
      },
    });

    // const result = await network.run(event.data.value, { state });

    let isBuildSuccessful = false;
    const maxRetries = 2; // Allow the AI up to 2 chances to fix its own code
    let attempt = 0;
    let currentPrompt = event.data.value; // Starts with the user's initial prompt
    let finalSummary = "";
    let finalFiles = state.data.files;

    // --- THE SELF-HEALING LOOP ---
    while (!isBuildSuccessful && attempt <= maxRetries) {
      // 1. Let the AI generate or fix the code in a deterministic step
      const generationResult = await step.run(`generate-code-attempt-${attempt}`, async () => {
        const executionPrompt = attempt === 0 ? event.data.value : currentPrompt;
        const result = await network.run(executionPrompt, { state });
        return {
          summary: result.state.data.summary,
          files: result.state.data.files,
        };
      });
      
      finalSummary = generationResult.summary || "Action completed specifically.";
      finalFiles = generationResult.files;

      // 2. Verify the build in an isolated step
      const buildCheck = await step.run(`verify-build-attempt-${attempt}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          console.log(`DEBUG: Running build check (Attempt ${attempt})...`);

          // Clean up to ensure a fresh build
          await sandbox.commands.run("rm -rf dist");

          // Run the standard Vite build
          await sandbox.commands.run("npm run build");

          return { success: true, error: "" };
        } catch (buildErr: unknown) {
          // Properly cast the unknown error to an object so TypeScript is happy
          const err = buildErr as { stderr?: string; stdout?: string; message?: string };

          // Extract the exact error message from Next.js
          const errorLog = err.stderr || err.stdout || err.message || "Unknown build error";
          console.error("DEBUG: Build failed with error:", errorLog.substring(0, 500)); // Log a snippet

          return { success: false, error: errorLog };
        }
      });

      if (buildCheck.success) {
        isBuildSuccessful = true; // The code works! Break out of the loop.
      } else {
        attempt++;
        if (attempt <= maxRetries) {
          console.log(`DEBUG: Feeding error back to AI for fix (Attempt ${attempt})...`);
          // Set the prompt for the next iteration to be the error log
          // Add a diagnostic hint for common AI mistakes
          let hint = "";
          if (buildCheck.error.includes("Expected '>', got 'className'")) {
            hint = "\n\nHINT: It looks like you put JSX/React components in a .ts file. Rename the file to .tsx to fix this.";
          }

          currentPrompt = `The React Vite build failed with the following error:\n\n${buildCheck.error}${hint}\n\nPlease analyze this error, fix the corresponding files using the createOrUpdateFiles or terminal tool, and reply with <task_summary> when finished.`;

          // CRITICAL: We must clear the summary from the state, otherwise the router will think the agent is already done and skip the fix!
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
