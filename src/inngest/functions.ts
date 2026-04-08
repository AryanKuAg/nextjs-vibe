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
        sandbox = await Sandbox.create("vibe-nextjs-alemantrix");
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
      return messageWithFragment?.fragment || null;
    });

    await step.run("hydrate-sandbox", async () => {
      if (latestFragment && latestFragment.files) {
        const sandbox = await getSandbox(sandboxId);
        const filesObj = latestFragment.files as Record<string, string>;

        for (const [path, content] of Object.entries(filesObj)) {
          if (typeof content === "string") {
            try {
              await sandbox.files.write(path, content);
            } catch (e) {
              console.error(`Failed to hydrate file ${path}`, e);
            }
          }
        }
      }
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
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  }
                });
                return result.stdout;
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

    const result = await network.run(event.data.value, { state });

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

    let finalSummary = result.state.data.summary;
    if (!finalSummary) {
      finalSummary = "Action completed specifically.";
    }

    const {
      output: fragmentTitleOutput
    } = await fragmentTitleGenerator.run(finalSummary);
    const {
      output: responseOutput
    } = await responseGenerator.run(finalSummary);

    const deploymentUrl = await step.run("deploy-to-cloudflare", async () => {
      try {
        const sandbox = await getSandbox(sandboxId);

        console.log("DEBUG: Building app inside sandbox...");
        await sandbox.commands.run(`rm -f next.config.ts next.config.js next.config.mjs && echo '/** @type {import("next").NextConfig} */\nconst nextConfig = { output: "export", images: { unoptimized: true }, eslint: { ignoreDuringBuilds: true }, typescript: { ignoreBuildErrors: true } };\nexport default nextConfig;' > next.config.mjs`);
        await sandbox.commands.run("npm run build");
        await sandbox.commands.run("cd out && zip -r ../out.zip .");

        const cfToken = process.env.CLOUDFLARE_API_TOKEN;
        const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

        if (!cfToken || !cfAccountId) {
          console.error("DEBUG: Missing Cloudflare tokens! Aborting deploy.");
          return null;
        }

        const projectName = `vibe-${event.data.projectId.substring(0, 15)}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

        console.log(`DEBUG: Creating CF project: ${projectName}`);
        await sandbox.commands.run(`curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects" -H "Authorization: Bearer ${cfToken}" -H "Content-Type: application/json" -d '{"name":"${projectName}","production_branch":"main"}'`);

        console.log("DEBUG: Uploading zip to CF...");
        const uploadResult = await sandbox.commands.run(`curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${projectName}/deployments" -H "Authorization: Bearer ${cfToken}" -F "file=@out.zip"`);

        console.log("DEBUG: Raw CF Response stdout:", uploadResult.stdout);
        console.log("DEBUG: Raw CF Response stderr:", uploadResult.stderr);

        const deploymentData = JSON.parse(uploadResult.stdout);

        if (deploymentData.success) {
          console.log("DEBUG: Deploy successful!");
          return `https://${projectName}.pages.dev`;
        } else {
          console.error("DEBUG: Cloudflare deploy failed:", deploymentData.errors);
          return null;
        }
      } catch (e) {
        console.error("DEBUG: Cloudflare Deploy catch block err:", e);
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
              files: result.state.data.files || {},
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
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
