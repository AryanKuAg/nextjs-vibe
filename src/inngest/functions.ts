import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent, createTool, createNetwork, type Tool, type Message, createState, gemini } from "@inngest/agent-kit";
//
import { prisma } from "@/lib/db";
import { FIXER_PROMPT, FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";

import { inngest } from "./client";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox, parseAgentOutput, lastAssistantTextMessageContent } from "./utils";

import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";
import { refundCredits, VEO_MODEL_COSTS } from "@/lib/usage";

// Constants moved to usage.ts

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
  {
    id: "code-agent",
    onFailure: async ({ error, event, step }) => {
      const projectId = event.data.event.data.projectId;
      // Guarantee the UI un-jams by writing a fallback Assistant message
      await step.run("unjam-ui", async () => {
        await prisma.message.create({
          data: {
            projectId: projectId,
            content: `The code agent encountered a critical infrastructure error and exhausted all retries. The error was: ${error.message}. Please send another prompt to try again. (Your credits will be automatically refunded by the system shortly)`,
            role: "ASSISTANT",
            type: "RESULT",
          }
        }).catch(err => console.error("Failed to write unjam message", err));

        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });
      });
    }
  },
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

      // If the returned sandboxId exactly matches the one previously saved in the DB, 
      // it means we successfully re-connected to the HOT instance and DO NOT need to hydrate!
      if (sandboxId === project?.sandboxId) {
        console.log("DEBUG: Sandbox is HOT 🔥! Skipping 2-minute file hydration.");
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


    const runId = event.id ? event.id.slice(0, 8) : Math.random().toString(36).substring(2, 10);

    // Factory to generate tools with safe, deterministic, auto-incrementing step IDs
    // Factory to generate tools with safe, deterministic, auto-incrementing step IDs
    const getToolsForAgent = (prefix: string) => {
      let terminalCount = 0;
      let readFilesCount = 0;
      let createFilesCount = 0; // <-- Add this counter

      return [
        createTool({
          name: "terminal",
          // ... keep existing terminal description/params ...
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            terminalCount++;
            return await step?.run(`terminal-${prefix}-call-${terminalCount}`, async () => {
              const buffers = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(`yes 2>/dev/null | (${command})`, {
                  timeoutMs: 0,
                  onStdout: (data: string) => { buffers.stdout += data; },
                  onStderr: (data: string) => { buffers.stderr += data; },
                });
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
          handler: async ({ files }, { network, step }: Tool.Options<AgentState>) => {
            createFilesCount++;

            // 1. Do the heavy API work INSIDE the step
            const updatedFiles = await step?.run(`createFiles-${prefix}-call-${createFilesCount}`, async () => {
              try {
                const updated: Record<string, string> = {};
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  await sandbox.commands.run(`touch "${file.path}"`); // Forces inotify event
                  updated[file.path] = file.content;
                }
                return updated;
              } catch (e) {
                throw new Error(`File write failed: ${e}`);
              }
            });

            // 2. Safely mutate the state OUTSIDE the step
            if (updatedFiles && network) {
              network.state.data.files = {
                ...(network.state.data.files || {}),
                ...updatedFiles,
              };
            }
            return `Successfully updated files`;
          },
        }),
        createTool({
          name: "readFiles",
          // ... keep existing readFiles code ...
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            readFilesCount++;
            return await step?.run(`readFiles-${prefix}-call-${readFilesCount}`, async () => {
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
      ];
    };

    // Factory function: creates an agent with unique name and step IDs per attempt.
    const createCodeAgentForAttempt = (attemptIndex: number, iterIndex: number = 0) => {
      return createAgent<AgentState>({
        name: `code-agent-run-${runId}-attempt-${attemptIndex}-iter-${iterIndex}`,
        description: "An expert coding agent",
        system: PROMPT,
        // Using 1.5-pro-002 for the highest reliability in tool-calling.
        // gemini-2.5-flash-lite often produces MALFORMED_FUNCTION_CALL.
        model: geminiVertexKey(event.data.model || "gemini-3.1-pro-preview"),
        tools: getToolsForAgent(`creator-${runId}-attempt-${attemptIndex}-iter-${iterIndex}`),
        lifecycle: {
          onResponse: async ({ result, network }) => {
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

    let currentPrompt = event.data.value; // Starts with the user's initial prompt
    let finalSummary = "";
    let finalFiles = state.data.files;

    // --- CONTEXT INJECTION FOR ITERATIONS ---
    const hasExistingFiles = Object.keys(initialFiles).length > 0;
    if (hasExistingFiles) {
      currentPrompt += `\n\n=== CURRENT PROJECT STATE ===\n`;
      currentPrompt += `You are modifying an existing project. Here are the current files:\n\n`;

      for (const [path, content] of Object.entries(initialFiles)) {
        // Skip injecting lockfiles or assets to save tokens and prevent confusion
        if (path.includes('package-lock.json') || path.includes('node_modules')) continue;

        currentPrompt += `--- ${path} ---\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }

      currentPrompt += `=== END PROJECT STATE ===\n\n`;
      currentPrompt += `CRITICAL INSTRUCTION: You are updating the existing project above based on the user's new request. ONLY use the \`createOrUpdateFiles\` tool to modify the specific files that require changes. Do NOT rewrite the entire application. Keep the existing design, components, and structure completely intact unless explicitly asked to change them.`;
    }

    if (event.data.videoUrl) {
      currentPrompt = `=== SCROLL ANIMATION REQUIREMENT (CRITICAL) ===
You MUST build an Apple-style, butter-smooth scroll-scrub animation utilizing a high-performance Frame Sequence directly mapped to the Canvas! 
To achieve this securely and perfectly:
1. A background pipeline natively populates the \`public/\` folder with exactly 450 highly compressed JPG files named \`frame-0001.jpg\` through \`frame-0450.jpg\`. DO NOT modify package.json for this.
2. **AURA PRELOADER**: You MUST build an ultra-premium, full-screen black Loading Screen overlay. It must display a massive numeric percentage (0% -> 100%) that physically tracks the actual network loading of the 450 image \`Image\` objects. Below it, include a pristine progress bar and text exactly like: "Loading all frames {current} / 450 — full scroll unlocks at 100%". The site must NOT be scrollable or visible until the preloader fully completes and fades out.
3. **PILL NAV MENU**: The Header/Navbar MUST NOT be full-width. It must be a floating, pill-shaped (fully rounded corners), glassmorphic black translucent bar perfectly horizontally centered at the top of the screen (use \`fixed left-1/2 -translate-x-1/2 top-6 z-50\`). Inside it: Brand Name on the left, navigation links in the middle, and a solid white 'Deploy Now' button on the right.
4. In your \`scroll-sequence.tsx\` or main application file, the architectural layout MUST be:
   - A global container with a dynamically calculated height to enforce the scrollable area.
   - A \`position: fixed, inset: 0, z-index: 0, w-full, h-full\` background \`<canvas>\` that fills the entire screen underneath EVERYTHING.
   - ALL normal sections (Hero, Features, Pricing, Footer) go ON TOP of the canvas with \`z-index: 10\`, and MUST HAVE TRANSPARENT BACKGROUNDS! 
5. Pre-load all 450 image paths STRICTLY USING RELATIVE PATHS from \`./frame-0001.jpg\` -> \`./frame-0450.jpg\` into Javascript \`Image\` objects. Update the Preloader state as they load! NEVER use absolute root paths (like /frame-0001.jpg) because the deployed app is hosted in a nested subdirectory!
6. **DYNAMIC SCROLL MAPPING**: Map \`window.scrollY\` strictly proportional to the maximum scrollable document height (which MUST be \`document.documentElement.scrollHeight - window.innerHeight\`). The Frame Index must map precisely from 1 to 450. 
   - **CRITICAL MATH**: When the user hits the absolute bottom of the page (where the Footer is fully visible), \`window.scrollY\` equals \`document.documentElement.scrollHeight - window.innerHeight\`, which MUST map exactly to Frame 450.
   - **NO OVER-SCROLL**: The canvas drawing logic MUST clamp the frame index: \`Math.min(450, Math.max(1, calculatedIndex))\`. If the user scrolls all the way down, the frame stops strictly at 450. The page itself must NOT have arbitrary extra whitespace at the bottom causing over-scroll. Make sure the height of the container perfectly fits the sections so the footer is the absolute end of the document.
7. Animate your transparent HTML sections fading in and out using Framer Motion tightly synchronized with the Canvas scroll depth!
=== END SCROLL ANIMATION REQUIREMENT ===

` + currentPrompt;
    }

    // --- 1. INITIAL GENERATION (The Creator) ---

    // --- 1. INITIAL GENERATION (The Creator) ---
    // Run the main massive agent exactly once to build the features
    const initialAgent = createCodeAgentForAttempt(0, 0);
    const initialNetwork = createNetwork<AgentState>({
      name: `coding-agent-network-run-${runId}-initial`,
      agents: [initialAgent],
      maxIter: 5,
      defaultState: state,
      router: async ({ network }) => {
        // If we have a summary, we are done! Return nothing to stop the loop.
        if (network.state.data.summary) return;
        return initialAgent; // Otherwise, run the agent
      },
      defaultModel: geminiVertexKey("gemini-3-flash-preview"),
    });

    console.log('DEBUG: Running initial Creator agent...');
    const result = await initialNetwork.run(currentPrompt, { state });

    finalSummary = result.state.data.summary || "";
    finalFiles = result.state.data.files;

    if (!finalSummary) {
      console.error("DEBUG: AI returned no summary. Halting.");
      finalSummary = "Task completed.";
    }

    // --- 2. THE SELF-HEALING LOOP (The Fixer) ---
    let isBuildSuccessful = false;
    const maxRetries = 5;
    let attempt = 1;

    while (!isBuildSuccessful && attempt <= maxRetries) {
      // Step A: Check the build
      const buildCheck = await step.run(`verify-build-run-${runId}-attempt-${attempt}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          await sandbox.commands.run("rm -rf dist");

          if (event.data.videoUrl) {
            console.log(`DEBUG: Downloading and unzipping master frames sequence...`);
            const zipResult = await sandbox.commands.run(`curl -f -s -L '${event.data.videoUrl}' -o frames.zip && (unzip -q -o frames.zip -d public || python3 -m zipfile -e frames.zip public) && rm frames.zip`);
            if (zipResult.exitCode !== 0) {
              console.error("ZIP FETCH ERR:", zipResult.stderr);
              throw new Error(`CRITICAL: Failed to download or unzip frames zip. GCS Permissions issue or invalid URL: ${zipResult.stderr}`);
            }
          }

          console.log(`DEBUG: Running strict TS check (Attempt ${attempt})...`);
          try {
            await sandbox.commands.run("npx tsc --noEmit");
          } catch (tsErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const tsErrorLog = ((tsErr.stdout || "") + "\n" + (tsErr.stderr || "")).trim();
            return { success: false, error: `TypeScript Error:\n${tsErrorLog}` };
          }

          console.log(`DEBUG: Running Vite build (Attempt ${attempt})...`);
          try {
            // Safeguard: Forcibly convert any absolute frame paths the AI wrote (/frame-) into relative paths (./frame-) 
            // so they resolve correctly inside the nested GCS bucket deployment.
            await sandbox.commands.run("find src -type f -name '*.tsx' -exec sed -i 's|/frame-|./frame-|g' {} + || true");

            await sandbox.commands.run("npm run build --silent -- --base=./");
          } catch (buildErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const viteErrorLog = ((buildErr.stdout || "") + "\n" + (buildErr.stderr || "")).trim();
            return { success: false, error: `Vite Build Error:\n${viteErrorLog}` };
          }

          return { success: true, error: "" };
        } catch (infraErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          return { success: false, error: `Sandbox Execution Error: ${infraErr.message || String(infraErr)}` };
        }
      });

      // Step B: Evaluate the check
      if (buildCheck.success) {
        console.log("DEBUG: Build passed successfully!");
        isBuildSuccessful = true;
        break; // Exit the loop!
      }

      // Step C: The Fixer Agent takes over
      // Step C: The Fixer Agent takes over
      console.log(`DEBUG: Build failed. Spinning up Fixer Agent (Attempt ${attempt})...`);

      // CREATE A CLEAN STATE FOR THE FIXER
      // We pass the files so it can edit them, but we do NOT pass the messages history.
      const fixerState = createState<AgentState>({
        summary: "",
        files: state.data.files,
      });

      // Create a dedicated mini-agent just for this fix attempt
      const fixerAgent = createAgent<AgentState>({
        name: `fixer-agent-run-${runId}-attempt-${attempt}`,
        description: "An expert debugging agent",
        system: FIXER_PROMPT,
        model: geminiVertexKey("gemini-3-flash-preview"),
        tools: getToolsForAgent(`fixer-${runId}-attempt-${attempt}`),
        lifecycle: {
          onResponse: async ({ result, network }) => {
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

      const fixerNetwork = createNetwork<AgentState>({
        name: `fixer-network-run-${runId}-attempt-${attempt}`,
        agents: [fixerAgent],
        maxIter: 3,
        defaultState: fixerState, // <--- USE THE CLEAN STATE HERE
        router: async ({ network }) => {
          if (network.state.data.summary) return;
          return fixerAgent;
        },
        defaultModel: geminiVertexKey("gemini-3-flash-preview"),
      });

      // --- SMART CONTEXT INJECTION FOR THE FIXER ---
      let brokenFilesContext = "";
      const hasStateFiles = Object.keys(fixerState.data.files).length > 0;
      if (hasStateFiles) {
        brokenFilesContext += `\n\n=== BROKEN FILES CONTENT ===\n`;
        let injectedCount = 0;

        for (const [path, content] of Object.entries(fixerState.data.files)) {
          if (buildCheck.error.includes(path)) {
            brokenFilesContext += `--- ${path} ---\n\`\`\`tsx\n${content}\n\`\`\`\n\n`;
            injectedCount++;
          }
        }
        brokenFilesContext += `=== END BROKEN FILES CONTENT ===\n\n`;

        if (injectedCount === 0) {
          brokenFilesContext = "\n*(Note: Could not auto-extract broken file contents. Use your `readFiles` tool to investigate the error above.)*\n";
        }
      }

      const fixPrompt = `🚨 CRITICAL BUILD FAILURE 🚨
The build failed with these exact errors:

${buildCheck.error}
${brokenFilesContext}

Follow your strict workflow: 1) Explain the fix, 2) Call the tool, 3) Output <task_summary>.`;

      // <--- USE THE CLEAN STATE HERE AS WELL
      const fixResult = await fixerNetwork.run(fixPrompt, { state: fixerState });

      // Update our master state with whatever the fixer changed
      state.data.files = fixResult.state.data.files;
      finalFiles = state.data.files;

      attempt++;
    }
    const fragmentTitleGenerator = createAgent({
      name: `fragment-title-generator-run-${runId}`, // Ensure name is unique per run!
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: geminiVertexKey("gemini-3-flash-preview"),
    });

    const responseGenerator = createAgent({
      name: `response-generator-run-${runId}`, // Ensure name is unique per run!
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: geminiVertexKey("gemini-3-flash-preview"),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(finalSummary);
    const { output: responseOutput } = await responseGenerator.run(finalSummary);

    console.log('hola', isBuildSuccessful);
    // ... continues to deploymentUrl ...

    const deploymentUrl = await step.run("deploy-to-gcp", async () => {
      if (!isBuildSuccessful) {
        console.log("DEBUG: Build failed or fixing loops exhausted. Aborting GCP deployment.");
        return null;
      }

      console.log("DEBUG: Build succeeded. Extracting dist/ text assets for GCS deployment...");
      const sandbox = await getSandbox(sandboxId);

      // Step 1: Extract only text/code assets from dist/ (skip images — they are too large for base64)
      const cmdResult = await sandbox.commands.run(`node -e "
        const fs = require('fs');
        const path = require('path');
        const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.mp4', '.woff', '.woff2']);
        const getFiles = (dir, fileList = {}) => {
          if (!fs.existsSync(dir)) return fileList;
          for (const f of fs.readdirSync(dir)) {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) getFiles(p, fileList);
            else {
              const ext = path.extname(f).toLowerCase();
              if (!IMAGE_EXTS.has(ext)) {
                fileList[p.replace(/\\\\/g, '/').replace('dist/', '')] = fs.readFileSync(p).toString('base64');
              }
            }
          }
          return fileList;
        };
        console.log(JSON.stringify(getFiles('dist')));
      "`, { timeoutMs: 60000 });

      if (cmdResult.exitCode !== 0) {
        console.error("Failed to read dist folder:", cmdResult.stderr);
        throw new Error("Failed to read dist folder natively");
      }

      const files = JSON.parse(cmdResult.stdout);
      const bucketName = process.env.GCS_BUCKET_NAME || 'spatial_io';
      const storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }
      });

      const bucket = storage.bucket(bucketName);
      const sitePrefix = `sites/${event.data.projectId}/`;

      // Step 2: Upload text/code assets to GCS in batches
      console.log(`DEBUG: Pushing ${Object.keys(files).length} text assets to GCS...`);
      const entries = Object.entries(files);
      const chunkSize = 25;

      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async ([relativePath, base64Content]) => {
          const buffer = Buffer.from(base64Content as string, 'base64');
          let contentType = "application/octet-stream";
          if (relativePath.endsWith(".html")) contentType = "text/html; charset=utf-8";
          else if (relativePath.endsWith(".js")) contentType = "application/javascript";
          else if (relativePath.endsWith(".css")) contentType = "text/css";
          else if (relativePath.endsWith(".svg")) contentType = "image/svg+xml";
          else if (relativePath.endsWith(".json")) contentType = "application/json";
          await bucket.file(`${sitePrefix}${relativePath}`).save(buffer, { metadata: { contentType } });
        }));
      }

      // Step 3: Stream the frames ZIP directly from GCS (videoUrl) and re-upload each frame
      // This avoids base64-encoding 450 large images through the E2B->Node pipeline entirely.
      if (event.data.videoUrl) {
        console.log(`DEBUG: Streaming frames ZIP from GCS and re-uploading to site prefix...`);
        const JSZip = (await import("jszip")).default;
        const zipResponse = await fetch(event.data.videoUrl);
        if (!zipResponse.ok) throw new Error(`Failed to fetch frames zip: ${zipResponse.statusText}`);
        const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
        const zip = await JSZip.loadAsync(zipBuffer);

        const frameEntries = Object.entries(zip.files).filter(([name, f]) => !f.dir && name.endsWith(".jpg"));
        const frameChunkSize = 25;
        for (let i = 0; i < frameEntries.length; i += frameChunkSize) {
          const chunk = frameEntries.slice(i, i + frameChunkSize);
          await Promise.all(chunk.map(async ([name, zipEntry]) => {
            const frameBuffer = Buffer.from(await zipEntry.async("arraybuffer"));
            await bucket.file(`${sitePrefix}${name}`).save(frameBuffer, { metadata: { contentType: "image/jpeg" } });
          }));
        }
        console.log(`DEBUG: Uploaded ${frameEntries.length} frames to GCS.`);
      }

      const finalUrl = `https://storage.googleapis.com/${bucketName}/${sitePrefix}index.html`;
      console.log(`DEBUG: GCP Deployment complete: ${finalUrl}`);
      return finalUrl;
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);

      // 1. Terminate any existing processes blocking port 3000 (prevents EADDRINUSE on rapid successive runs)
      await sandbox.commands.run("kill -9 $(lsof -t -i:3000) 2>/dev/null || true");

      if (event.data.videoUrl) {
        console.log(`DEBUG: Bootstrapping master frames sequence for Sandbox Dev Server...`);
        const devZipResult = await sandbox.commands.run(`curl -f -s -L '${event.data.videoUrl}' -o frames.zip && (unzip -q -o frames.zip -d public || python3 -m zipfile -e frames.zip public) && rm frames.zip`);
        if (devZipResult.exitCode !== 0) {
          throw new Error(`CRITICAL DEV SERVER: Failed to fetch frames. GCS limits or invalid URL: ${devZipResult.stderr}`);
        }
      }

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

    const completeFiles = await step.run("get-all-sandbox-files", async () => {
      try {
        const sandbox = await getSandbox(sandboxId);
        // Scrape the sandbox using a strict Whitelist approach.
        // We only want 'src/', 'public/', and specific configuration files. 
        // This prevents capturing massive hidden folders like '~/.npm'.
        const cmdResult = await sandbox.commands.run(`node -e "
          const fs = require('fs');
          const path = require('path');
          
          function getFiles(dir, fileList = {}) {
            if (!fs.existsSync(dir)) return fileList;
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filePath = path.join(dir, file);
              if (fs.statSync(filePath).isDirectory()) {
                getFiles(filePath, fileList);
              } else {
                const ext = path.extname(filePath).toLowerCase();
                const normalizedPath = filePath.split(path.sep).join('/');
                if (['.jpg', '.webp'].includes(ext)) {
                   fileList[normalizedPath] = 'BINARY_ASSET_OMITTED_FROM_SYNC';
                } else if (!['.png', '.jpeg', '.gif', '.ico', '.mp4', '.woff', '.woff2'].includes(ext)) {
                   fileList[normalizedPath] = fs.readFileSync(filePath, 'utf8');
                }
              }
            }
            return fileList;
          }
          
          const result = {};
          
          // 1. Recursively get UI directories
          Object.assign(result, getFiles('src'));
          Object.assign(result, getFiles('public'));
          
          // 2. Explicitly grab root configuration files
          const rootFiles = [
            'index.html', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js', 
            'package.json', 'components.json', 'eslint.config.js', 'tsconfig.app.json', 
            'tsconfig.json', 'tsconfig.node.json'
          ];
          
          for (const file of rootFiles) {
            if (fs.existsSync(file)) {
              result[file] = fs.readFileSync(file, 'utf8');
            }
          }
          
          console.log(JSON.stringify(result));
        "`);

        const parsedFiles = JSON.parse(cmdResult.stdout.trim());
        return parsedFiles;
      } catch (e) {
        console.error('DEBUG: Failed to extract full file tree from sandbox:', e);
        return null;
      }
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
              files: completeFiles || finalFiles || {},
            },
          },
        },
      });
    });

    return {
      url: deploymentUrl || sandboxUrl,
      deploymentUrl: deploymentUrl,
      sandboxUrl: sandboxUrl,
      title: parseAgentOutput(fragmentTitleOutput) || "Project",
      files: finalFiles,
      summary: finalSummary,
    };
  },
);

export const veoGenerateFunction = inngest.createFunction(
  { id: "veo-generate", retries: 0 },
  { event: "veo/generate" },
  async ({ event, step }) => {
    const { projectId, prompt, model, userId } = event.data;
    const cost = VEO_MODEL_COSTS[model as string] || 75;

    const tokenHelper = async () => {
      const auth = new GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const { token } = await client.getAccessToken();
      return token;
    };

    try {
      await step.run("update-project-stage-generating", async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "GENERATING_VIDEO" }
        });
      });

      const operationName = await step.run("start-veo-generation", async () => {
        try {
          const token = await tokenHelper();
          const projectId = process.env.GOOGLE_CLOUD_PROJECT;
          const targetModel = model || "veo-3.1-lite-generate-001";
          const url = `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/publishers/google/models/${targetModel}:predictLongRunning`;

          let instances: Record<string, unknown>[] = [{ prompt: prompt }];

          if (event.data.imageUrl) {
            const bucketMatch = event.data.imageUrl.match(/storage\.googleapis\.com\/([^\/]+)\/(.+)$/);
            if (bucketMatch) {
              instances = [{
                prompt: prompt,
                image: {
                  gcsUri: `gs://${bucketMatch[1]}/${bucketMatch[2]}`,
                  mimeType: "image/png" // assuming standard generated image
                }
              }];
            }
            //
          } else if (event.data.imageBase64) {
            instances = [{
              prompt: prompt,
              image: {
                bytesBase64Encoded: event.data.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: "image/png"
              }
            }];
          }

          const payload = {
            instances,
            parameters: {
              aspectRatio: "16:9",
              resolution: "720p",
              durationSeconds: 8,
              includeAudio: false,
              generateAudio: false
            }
          };

          const result = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          const data = await result.json();

          if (!result.ok) {
            throw new Error(JSON.stringify(data));
          }

          return data.name; // operation name
        } catch (err: unknown) {
          throw new Error((err as Error)?.message || String(err));
        }
      });

      // Poll Initial LRO and Extend recursively via REST
      const videoUri = await step.run("poll-and-extend-veo", async () => {
        let base64VideoData: string | null | undefined = null;
        let isDone = false;

        console.log(`[Veo Extended Pipeline] Polling Phase 1...`);
        // Phase 1 Polling
        while (!isDone) {
          await new Promise(r => setTimeout(r, 15000));

          const token = await tokenHelper();
          const url = `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:fetchPredictOperation`;

          const result = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ operationName })
          });

          const data = await result.json();
          if (!result.ok) throw new Error(JSON.stringify(data));

          if (data.done) {
            isDone = true;
            if (data.error) throw new Error(JSON.stringify(data.error));

            base64VideoData = data.response?.videos?.[0]?.bytesBase64Encoded;

            if (!base64VideoData) {
              const filterReasons = data.response?.raiMediaFilteredReasons;
              const reasonStr = filterReasons ? filterReasons.join(", ") : JSON.stringify(data.response);
              throw new Error(`Veo finished but returned no video format! Raw response: ${reasonStr}`);
            }
          }
        }


        console.log(`[Veo Extended Pipeline] Pushing Phase 1 Chunk to GCS natively to bypass node limits...`);
        const bucketName = process.env.GCS_BUCKET_NAME || 'spatial_io';
        const storage = new Storage({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }
        });

        const bucket = storage.bucket(bucketName);
        const part1OutputName = `videos/project-${event.data.projectId}-part1-${Date.now()}.mp4`;
        const filePart1 = bucket.file(part1OutputName);
        const buffer1 = Buffer.from(base64VideoData!, 'base64');
        await filePart1.save(buffer1, { metadata: { contentType: "video/mp4" } });

        // Phase 2: Start Extension Sequence
        console.log(`[Veo Extended Pipeline] Initiating Phase 2 Extention via GCS streaming...`);
        const token = await tokenHelper();
        const extUrl = `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:predictLongRunning`;

        const payload = {
          instances: [{
            prompt: prompt, // Keep prompt aligned to force motion continuation
            video: {
              gcsUri: `gs://${bucketName}/${part1OutputName}`, // Use GCS bypass
              mimeType: "video/mp4"
            }
          }],
          parameters: { aspectRatio: "16:9", resolution: "720p", durationSeconds: 7, includeAudio: false, generateAudio: false }
        };

        const extResult = await fetch(extUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const extData = await extResult.json();
        if (!extResult.ok) throw new Error(JSON.stringify(extData));

        const operationName2 = extData.name;

        // Phase 2 Polling
        isDone = false;
        let finalBase64VideoData = null;
        console.log(`[Veo Extended Pipeline] Polling Phase 2...`);

        while (!isDone) {
          await new Promise(r => setTimeout(r, 15000));
          const token2 = await tokenHelper();
          const url2 = `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/veo-3.1-lite-generate-001:fetchPredictOperation`;

          const result2 = await fetch(url2, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
            body: JSON.stringify({ operationName: operationName2 })
          });

          const data2 = await result2.json();
          if (!result2.ok) throw new Error(JSON.stringify(data2));

          if (data2.done) {
            isDone = true;
            if (data2.error) throw new Error(JSON.stringify(data2.error));

            finalBase64VideoData = data2.response?.videos?.[0]?.bytesBase64Encoded;

            if (!finalBase64VideoData) {
              throw new Error(`Veo extension finished but returned no video! Raw: ${JSON.stringify(data2.response)}`);
            }
          }
        }

        console.log(`[Veo Extended Pipeline] Flushing 16-Second Master Video to GCS!`);
        const finalOutputName = `videos/project-${event.data.projectId}-final-${Date.now()}.mp4`;
        const fileFinal = bucket.file(finalOutputName);

        const bufferFinal = Buffer.from(finalBase64VideoData, 'base64');
        await fileFinal.save(bufferFinal, { metadata: { contentType: "video/mp4" } });

        return `https://storage.googleapis.com/${bucketName}/${finalOutputName}`;
      });

      await step.run("update-project-video-url", async () => {
        const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingUrls = Array.isArray((existingProject as any)?.videoUrls) ? (existingProject as any).videoUrls as string[] : [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.project as any).update({
          where: { id: projectId },
          data: {
            videoUrls: [...existingUrls, videoUri],
            currentStage: "VIDEO"
          }
        });
      });

      return { videoUrl: videoUri };
    } catch (error: unknown) {
      // Global Failure Handler: Ensure UI is NEVER stuck and credits are refunded
      await step.run("handle-video-generation-failure", async () => {
        // 1. Reset project stage so user can try again
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });

        // 2. Refund credits since generation failed
        await refundCredits(cost, userId).catch(() => { });
      });

      throw error;
    }
  }
);
