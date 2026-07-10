import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent, createTool, createNetwork, type Tool, type Message, createState, openai } from "@inngest/agent-kit";
//
import { prisma } from "@/lib/db";
import { FIXER_PROMPT, FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";

import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox, parseAgentOutput, lastAssistantTextMessageContent } from "./utils";

import { Storage } from "@google-cloud/storage";


import { consumeCredits, MODEL_COSTS } from "@/lib/usage";

// Constants moved to usage.ts



const checkCancellation = async (projectId: string) => {
  const pCheck = await prisma.project.findUnique({
    where: { id: projectId },
    select: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (pCheck?.messages?.[0]?.content === "Generation was manually stopped.") {
    throw new NonRetriableError("Generation was manually stopped.");
  }
};



interface AgentState {
  summary: string;
  files: { [path: string]: string };
};

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    timeouts: { finish: "15m" },
    onFailure: async ({ error, event, step }) => {
      const projectId = event.data.event.data.projectId;

      // Guarantee the UI un-jams by writing a fallback Assistant message
      await step.run("unjam-ui", async () => {
        if (error.message !== "Generation was manually stopped.") {
          await prisma.message.create({
            data: {
              projectId: projectId,
              content: `The code agent encountered a critical infrastructure error and exhausted all retries. The error was: ${error.message}. Please send another prompt to try again.`,
              role: "ASSISTANT",
              type: "RESULT",
            }
          }).catch(err => console.error("Failed to write unjam message", err));
        }

        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });
      });
    }
  },
  {
    event: "code-agent/run",
    cancelOn: [
      {
        event: "code-agent/cancel",
        match: "data.projectId",
      }
    ]
  },
  async ({ event, step }) => {
    const project = await step.run("get-project", async () => {
      return await prisma.project.findUnique({
        where: { id: event.data.projectId }
      });
    });

    let videoUrl = event.data.videoUrl;
    if (!videoUrl && event.data.frameCount) {
      const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
      const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
      videoUrl = `${cdnBase}/frames/${event.data.projectId}/frames.zip`;
      console.log(`DEBUG: Reconstructed deterministic videoUrl from project ID: ${videoUrl}`);
    }

    const getModel = (modelName: string) => {
      // Fallback if OpenRouter models are passed
      return openai({
        model: modelName.replace("openrouter-", ""),
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseUrl: "https://openrouter.ai/api/v1",
      });
    };

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

    const initialFiles = await step.run("get-initial-files", async () => {
      let files: Record<string, string> = {};
      if (latestFragment && latestFragment.files && typeof latestFragment.files === "object") {
        files = latestFragment.files as Record<string, string>;
      }

      // If it's a new project (no files), load all templates. Otherwise, always enforce golden templates.
      const fs = await import("fs");
      const path = await import("path");
      const templatesDir = path.join(process.cwd(), "src", "templates");

      if (Object.keys(files).length === 0) {
        const readDirRecursive = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              readDirRecursive(fullPath);
            } else {
              const relativePath = path.relative(templatesDir, fullPath);
              files[`src/${relativePath}`] = fs.readFileSync(fullPath, "utf-8");
            }
          }
        };
        readDirRecursive(templatesDir);

        if (!videoUrl) {
          const PROTECTED_FILES = [
            "src/components/CanvasScroll.tsx",
            "src/components/Preloader.tsx",
            "src/store/useStore.ts",
            "src/constants/frames.ts",
            "src/components/headers/DotNav.tsx",
            "src/components/headers/FullWidthNav.tsx",
            "src/components/headers/PillNav.tsx",
          ];
          for (const file of PROTECTED_FILES) {
            delete files[file];
          }
          files["src/App.tsx"] = `export default function App() {\n  return (\n    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">\n      <h1 className="text-4xl font-bold mb-4">Hello World</h1>\n      <p className="text-lg text-muted-foreground">Start building your application here.</p>\n    </div>\n  );\n}\n`;
        }
      } else {
        // Enforce golden templates on follow-ups to keep them synced and prevent dummy components
        if (videoUrl) {
          const PROTECTED_FILES = [
            "src/components/CanvasScroll.tsx",
            "src/components/Preloader.tsx",
            "src/store/useStore.ts",
            "src/constants/frames.ts",
            "src/components/headers/DotNav.tsx",
            "src/components/headers/FullWidthNav.tsx",
            "src/components/headers/PillNav.tsx",
          ];
          for (const file of PROTECTED_FILES) {
            const templatePath = path.join(templatesDir, file.replace("src/", ""));
            if (fs.existsSync(templatePath)) {
              files[file] = fs.readFileSync(templatePath, "utf-8");
            }
          }
        }
      }

      // ALWAYS dynamically replace frame count, even on follow-up prompts
      if (event.data.frameCount) {
        const frameContent = files["src/constants/frames.ts"];
        if (frameContent) {
          files["src/constants/frames.ts"] = frameContent.replace(
            /export const TOTAL_FRAMES = \d+;?/,
            `export const TOTAL_FRAMES = ${event.data.frameCount};`
          );
        }
      }

      return files;
    });

    await step.run("hydrate-sandbox", async () => {
      const filesObj = initialFiles;
      const hasFiles = Object.keys(filesObj).length > 0;

      if (!hasFiles) {
        console.log("DEBUG: Skipping hydration — no previous files to seed into sandbox.");
        return null;
      }

      const PROTECTED_FILES = videoUrl ? [
        "src/components/CanvasScroll.tsx",
        "src/components/Preloader.tsx",
        "src/store/useStore.ts",
        "src/constants/frames.ts",
        "src/components/headers/DotNav.tsx",
        "src/components/headers/FullWidthNav.tsx",
        "src/components/headers/PillNav.tsx",
      ] : [];

      // Helper function to write a file absolute to /home/user and ensure directory exists
      const writeSandboxFile = async (sandbox: Sandbox, filePath: string, content: string) => {
        const absolutePath = filePath.startsWith('/') ? filePath : `/home/user/${filePath}`;
        const dirParts = filePath.split('/');
        if (dirParts.length > 1 && !filePath.startsWith('/')) {
          const dir = dirParts.slice(0, -1).join('/');
          await sandbox.commands.run(`mkdir -p "/home/user/${dir}"`);
        }
        await sandbox.files.write(absolutePath, content);
      };

      // If the returned sandboxId exactly matches the one previously saved in the DB, 
      // it means we successfully re-connected to the HOT instance and DO NOT need to hydrate!
      if (sandboxId === project?.sandboxId) {
        console.log("DEBUG: Sandbox is HOT 🔥! Skipping 2-minute file hydration.");

        try {
          const sandbox = await getSandbox(sandboxId);
          const fs = await import("fs");
          const path = await import("path");

          // Ensure all protected template files are present and correct in the hot sandbox
          for (const file of PROTECTED_FILES) {
            const templatePath = path.join(process.cwd(), "src", "templates", file.replace("src/", ""));
            if (fs.existsSync(templatePath)) {
              const content = fs.readFileSync(templatePath, "utf-8");
              await writeSandboxFile(sandbox, file, content);
              console.log(`DEBUG: Force-wrote template file ${file} to hot sandbox`);
            }
          }

          // We MUST still update the frames.ts file in case the user extracted new frames
          // between prompts, otherwise the hot sandbox will retain the old frame count.
          if (event.data.frameCount && filesObj["src/constants/frames.ts"]) {
            await writeSandboxFile(sandbox, "src/constants/frames.ts", filesObj["src/constants/frames.ts"]);
            console.log(`DEBUG: Updated src/constants/frames.ts in HOT sandbox to ${event.data.frameCount} frames.`);
          }
        } catch (e) {
          console.error("Failed to ensure template files in hot sandbox", e);
        }

        return null;
      }

      const sandbox = await getSandbox(sandboxId);
      let written = 0;

      // Ensure directory structure and write all files
      for (const [filePath, content] of Object.entries(filesObj)) {
        if (typeof content === "string") {
          try {
            await writeSandboxFile(sandbox, filePath, content);
            written++;
          } catch {
            // Just ignore and continue.
          }
        }
      }

      // Also force-write the templates just to be safe on fresh sandbox
      try {
        const fs = await import("fs");
        const path = await import("path");
        for (const file of PROTECTED_FILES) {
          const templatePath = path.join(process.cwd(), "src", "templates", file.replace("src/", ""));
          if (fs.existsSync(templatePath)) {
            const content = fs.readFileSync(templatePath, "utf-8");
            await writeSandboxFile(sandbox, file, content);
            console.log(`DEBUG: Force-wrote template file ${file} to new sandbox`);
          }
        }
      } catch (e) {
        console.error("Failed to ensure template files on new sandbox hydration", e);
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

    const previousFiles = await step.run("get-previous-files", async () => {
      if (!event.data.isFollowUp) return null;

      const latestMessage = await prisma.message.findFirst({
        where: { projectId: event.data.projectId, role: "ASSISTANT", type: "RESULT" },
        orderBy: { createdAt: "desc" },
        include: { fragment: true }
      });

      return (latestMessage?.fragment?.files as Record<string, string>) || null;
    });

    const state = createState<AgentState>(
      {
        summary: "",
        files: previousFiles || (initialFiles as Record<string, string>),
      },
      {
        messages: previousMessages as any,
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
          description: "Execute a terminal command in the sandbox",
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

                const PROTECTED_FILES = videoUrl ? [
                  "src/components/CanvasScroll.tsx",
                  "src/components/Preloader.tsx",
                  "src/store/useStore.ts",
                  "src/constants/frames.ts",
                  "src/components/headers/DotNav.tsx",
                  "src/components/headers/FullWidthNav.tsx",
                  "src/components/headers/PillNav.tsx",
                ] : [];

                for (const file of files) {
                  if (!file || !file.path || typeof file.path !== "string" || file.path.trim() === "") {
                    console.warn("Skipping file write, invalid or empty path:", file?.path);
                    continue;
                  }

                  if (PROTECTED_FILES.includes(file.path)) {
                    console.log(`DEBUG: Blocking AI from modifying protected core file: ${file.path}`);
                    continue;
                  }
                  if (typeof file.content !== "string") {
                    file.content = String(file.content || "");
                  }

                  // Strict enforcement for App.tsx integrity
                  if (videoUrl && file.path === "src/App.tsx") {
                    const c = file.content;
                    if (!c.includes("<CanvasScroll") || !c.includes("<Preloader")) {
                      throw new Error("CRITICAL ARCHITECTURE ERROR: You removed <CanvasScroll /> or <Preloader /> from App.tsx. You MUST include them.");
                    }
                    if (/\{\/\*\s*<CanvasScroll/i.test(c) || /\/\/\s*import.*CanvasScroll/i.test(c)) {
                      throw new Error("CRITICAL ARCHITECTURE ERROR: You commented out CanvasScroll in App.tsx. Do NOT comment it out.");
                    }
                    if (/\{\/\*\s*<Preloader/i.test(c) || /\/\/\s*import.*Preloader/i.test(c)) {
                      throw new Error("CRITICAL ARCHITECTURE ERROR: You commented out Preloader in App.tsx. Do NOT comment it out.");
                    }
                  }

                  // Ensure parent directory exists before writing to prevent missing directory errors
                  const dirParts = file.path.split('/');
                  if (dirParts.length > 1) {
                    const dir = dirParts.slice(0, -1).join('/');
                    await sandbox.commands.run(`mkdir -p "/home/user/${dir}"`);
                  }

                  await sandbox.files.write(`/home/user/${file.path}`, file.content);
                  await sandbox.commands.run(`touch "/home/user/${file.path}"`); // Forces inotify event
                  updated[file.path] = file.content;
                }
                return { updated };
              } catch (e) {
                const err = e as Error;
                return { error: `File write failed: ${err.message || String(err)}` };
              }
            });

            if (updatedFiles && 'error' in updatedFiles) {
              return updatedFiles.error || "File write failed";
            }

            // 2. Safely mutate the state OUTSIDE the step
            if (updatedFiles && 'updated' in updatedFiles && network) {
              network.state.data.files = {
                ...(network.state.data.files || {}),
                ...updatedFiles.updated,
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
                  const absolutePath = file.startsWith('/') ? file : `/home/user/${file}`;
                  const content = await sandbox.files.read(absolutePath);
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
        model: getModel(event.data.model || "deepseek/deepseek-v4-flash"),
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

    if (videoUrl) {
      currentPrompt = `=== TEMPLATE ARCHITECTURE INSTRUCTION (CRITICAL) ===
The sandbox has already been pre-populated with a production-ready Apple-style scroll-scrub architecture.
You DO NOT need to build the canvas logic or the preloader. They are already provided and wired up in \`src/App.tsx\`.

Specifically, you ALREADY HAVE:
1. \`src/components/CanvasScroll.tsx\` - Handles the high-performance background frame rendering.
2. \`src/components/Preloader.tsx\` - A full-screen aura loading state.
3. \`src/components/Navbar.tsx\` - A default pill-shaped navigation bar.
4. \`src/components/headers/\` - A directory containing alternative header templates (\`DotNav.tsx\`, \`FullWidthNav.tsx\`, \`PillNav.tsx\`).
5. \`src/store/useStore.ts\` - Global state management for frames.
6. \`src/App.tsx\` - The layout wrapper that combines these components.

YOUR ONLY JOB:
1. Create stunning, modern page sections (like Hero, Features, Pricing, Footer, etc.) inside \`src/components/sections/\`.
2. Import and inject these sections into the \`<main>\` element inside the provided \`src/App.tsx\`. Let the natural height of these sections dictate the total scroll length of the page.
3. CREATE HIGHLY UNIQUE DESIGNS: You are highly encouraged to invent entirely NEW layouts, typography choices, color palettes, and unconventional structures. DO NOT default to the provided pill-shaped Navbar. You MUST redesign the navigation or use one of the alternative headers to match the specific vibe of the user's prompt. DO NOT build the exact same centered-text hero section every time. Introduce grids, side-panels, bento boxes, etc.
4. **ANIMATION RULE (CRITICAL)**: Do NOT use complex \`useScroll\` mappings or global \`scrollYProgress\` with hardcoded arrays (e.g. \`[0, 0.2, 0.5]\`). You will get the math wrong and cause sections to disappear! Instead, simply use Framer Motion's \`whileInView={{ opacity: 1, y: 0 }}\` and \`initial={{ opacity: 0, y: 50 }}\` on your components. Let standard CSS document flow handle the scroll position!
5. **LAYOUT & SPACING (CRITICAL)**: Do NOT build massive centered cards or huge solid blocks that obscure the background! The background video canvas is the star of the show. Mostly create edge-aligned, minimalist typographic content (e.g., text aligned to the left/right edges, bottom corners). 
6. **SECTION COUNT**: Generate exactly 4 to 5 sections (Hero, Features, Details, Footer). Make sure each section has a generous \`min-h-[100vh]\` to give the user a long, satisfying scroll experience to scrub through the background video. The footer MUST be the final section so it sits at the absolute bottom of the scroll.
7. **CRITICAL FOREGROUND RULE**: ALL normal sections (Hero, Features, Pricing, Footer) MUST HAVE COMPLETELY TRANSPARENT BACKGROUNDS! Do NOT use \`bg-black\`, \`bg-white\`, or \`bg-background\` on any of your main page wrappers. Use glassmorphism (e.g. \`bg-black/40 backdrop-blur-md\`) ONLY if you strictly need readable contrast for text.
8. **OVERLAY & BODY PROHIBITION (CRITICAL)**: NEVER set a background color on \`html\`, \`body\`, or \`#root\` in your CSS or HTML. NEVER add any \`<div>\` or \`<section>\` with a solid or semi-opaque background color (\`bg-black\`, \`bg-black/80\`, \`bg-gray-900\`, \`background: rgba(0,0,0,X)\`, etc.) that spans full-width or full-height and sits on top of the canvas. The canvas images MUST ALWAYS be fully visible.
9. **BRANDING**: You MUST update \`index.html\` to have a \`<title>\` that matches the generated site's name (not "Vite + React + TS"). You MUST also replace the default Vite favicon with a relevant emoji encoded as an SVG data URI in the \`<link rel="icon">\` tag.
10. **CRITICAL IMPORT RULE**: You MUST use relative imports based on the file's location. For example, inside \`src/App.tsx\` use \`./components/Navbar.tsx\` or \`./components/headers/FullWidthNav\`. Inside \`src/components/sections/Hero.tsx\` use \`../Navbar.tsx\`. NEVER use \`@/\` alias imports! The build system does NOT have \`@/\` configured and it will fail to compile. Also, ensure you use the terminal tool to run \`npm install zustand framer-motion lucide-react\` so the provided templates work!
11. **STRICT REACT RULES (CRITICAL)**: To prevent Minified React Error #321, NEVER define a component function inside another component function. NEVER call hooks conditionally or inside loops. Ensure all components are standard React functions.
12. **MINIMAL, TRANSPARENT UI (CRITICAL)**: You must generate a very minimal website. Keep UI elements small, sleek, and highly transparent. DO NOT use large glassmorphic cards or heavy blur overlays. The background video canvas MUST shine through clearly.
13. **NO IMAGES ALLOWED (CRITICAL)**: You MUST NEVER use \`<img>\` tags or any other image elements anywhere in the application. We do not have any images to load, so using \`<img>\` tags will result in broken images. If you need to represent an image placeholder, use a simple empty \`<div>\` with a border or minimal styling.
14. **TRANSPARENCY REITERATION**: The background canvas is the primary visual! Ensure that \`src/App.tsx\` and ALL your sections use transparent backgrounds. Any solid background color or heavy backdrop-blur will hide the animation and result in failure!
15. **LOCKED FILES (CRITICAL)**: The following files are strictly locked and your modifications to them will be automatically REJECTED by the system:
    - \`src/components/CanvasScroll.tsx\`
    - \`src/components/Preloader.tsx\`
    - \`src/store/useStore.ts\`
    - \`src/constants/frames.ts\`
    - \`src/components/headers/DotNav.tsx\`, \`FullWidthNav.tsx\`, \`PillNav.tsx\`
    DO NOT attempt to modify these files. DO NOT recreate them.

When modifying \`src/App.tsx\`, you MUST PRESERVE the \`<Preloader />\` and \`<CanvasScroll />\` components exactly as they were provided. Do NOT remove them from the layout! Just focus on injecting your sections into the \`<main>\` tag!
=== END TEMPLATE ARCHITECTURE INSTRUCTION ===

` + currentPrompt;
    } else {
      currentPrompt = `=== STANDARD WEBSITE ARCHITECTURE ===
Build a standard, high-quality React application based on the user's prompt. 
You have full creative freedom. There is no background video, so you can use any colors, backgrounds, or layouts you want.
Create unique, stunning designs. Do NOT just make a plain white page.
=== END STANDARD WEBSITE ARCHITECTURE ===

` + currentPrompt;
    }

    // Inject image reference into the prompt when a user attaches an image
    if (event.data.imageUrl) {
      currentPrompt = `[The user has attached a reference image. Use it as a visual guide for the design, layout, color palette, and style of the generated website.]\n\nReference image URL: ${event.data.imageUrl}\n\n` + currentPrompt;
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
        await checkCancellation(event.data.projectId);
        await checkCancellation(event.data.projectId);
        // If we have a summary, we are done! Return nothing to stop the loop.
        if (network.state.data.summary) return;
        return initialAgent; // Otherwise, run the agent
      },
      defaultModel: getModel(event.data.model || "openai/gpt-oss-120b:free"),
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
      await checkCancellation(event.data.projectId);
      // Step A: Check the build
      const buildCheck = await step.run(`verify-build-run-${runId}-attempt-${attempt}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          await sandbox.commands.run("rm -rf dist");

          // Ensure all protected template files are present and correct in the sandbox
          const PROTECTED_FILES = videoUrl ? [
            "src/components/CanvasScroll.tsx",
            "src/components/Preloader.tsx",
            "src/store/useStore.ts",
            "src/constants/frames.ts",
            "src/components/headers/DotNav.tsx",
            "src/components/headers/FullWidthNav.tsx",
            "src/components/headers/PillNav.tsx",
          ] : [];

          const fs = await import("fs");
          const path = await import("path");
          for (const file of PROTECTED_FILES) {
            const templatePath = path.join(process.cwd(), "src", "templates", file.replace("src/", ""));
            if (fs.existsSync(templatePath)) {
              try {
                let content = fs.readFileSync(templatePath, "utf-8");
                if (file === "src/constants/frames.ts") {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const frameCount = event.data.frameCount || (project as any)?.frameCount || 450;
                  content = content.replace(/TOTAL_FRAMES = \d+;/, `TOTAL_FRAMES = ${frameCount};`);
                }
                const dir = path.dirname(file);
                await sandbox.commands.run(`mkdir -p "/home/user/${dir}"`);
                await sandbox.files.write(`/home/user/${file}`, content);
                console.log(`DEBUG: Force-wrote template file ${file} to sandbox`);
              } catch (e) {
                console.error(`Failed to force-write template file ${file}`, e);
              }
            }
          }

          if (videoUrl) {
            console.log(`DEBUG: Downloading and unzipping master frames sequence...`);
            const zipResult = await sandbox.commands.run(`curl -f -s -L '${videoUrl}' -o frames.zip && (unzip -q -o frames.zip -d public || python3 -m zipfile -e frames.zip public) && rm frames.zip`);
            if (zipResult.exitCode !== 0) {
              console.error("ZIP FETCH ERR:", zipResult.stderr);
              throw new Error(`CRITICAL: Failed to download or unzip frames zip. GCS Permissions issue or invalid URL: ${zipResult.stderr}`);
            }
          }

          console.log(`DEBUG: Running structural checks (Attempt ${attempt})...`);
          const checkStructureScript = videoUrl ? `
const fs = require('fs');
if (fs.existsSync('src/App.tsx')) {
  const c = fs.readFileSync('src/App.tsx', 'utf8');
  const hasCanvas = c.includes('<CanvasScroll');
  const hasPreloader = c.includes('<Preloader');
  const canvasCommented = c.match(/\\{\\/\\*\\s*<CanvasScroll/);
  const preloaderCommented = c.match(/\\{\\/\\*\\s*<Preloader/);
  
  if (!hasCanvas || !hasPreloader || canvasCommented || preloaderCommented) {
    console.error('CRITICAL ERROR: App.tsx is missing <CanvasScroll /> or <Preloader />, or they are commented out. They MUST be present and active.');
    process.exit(1);
  }
}
` : `console.log("No structure check for non-video projects.");`;
          await sandbox.files.write("/app/check-structure.js", checkStructureScript);
          const structCheck = await sandbox.commands.run("node /app/check-structure.js");
          if (structCheck.exitCode !== 0) {
            return { success: false, error: `Structural Error:\n${structCheck.stderr || structCheck.stdout}` };
          }

          console.log(`DEBUG: Running automated pre-fixes (Attempt ${attempt})...`);
          try {
            await sandbox.commands.run("npx eslint . --fix", { timeoutMs: 10000 });
          } catch {
            // ESLint might return non-zero exit code if some errors are unfixable; ignore and proceed
          }

          console.log(`DEBUG: Running strict TS check (Attempt ${attempt})...`);
          try {
            await sandbox.commands.run("npx tsc --noEmit");
          } catch (tsErr) {
            const err = tsErr as { stdout?: string, stderr?: string };
            const tsErrorLog = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
            return { success: false, error: `TypeScript Error:\n${tsErrorLog}` };
          }

          console.log(`DEBUG: Running Vite build (Attempt ${attempt})...`);
          try {
            // Safeguard: Convert absolute frame paths (/frame-) into relative paths (./frame-) 
            // We use a robust Node script to avoid turning existing './frame-' into '.../frame-'
            const fixPathsScript = `
const fs = require('fs');
const path = require('path');
function fixPaths(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) fixPaths(p);
    else if (p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css')) {
      let content = fs.readFileSync(p, 'utf8');
      let changed = false;

      // Fix App.tsx dummy declarations
      if (f === 'App.tsx') {
        let originalContent = content;
        
        // Remove dummy definitions
        const dummyPatterns = [
          /const\s+Preloader\s*=\s*\(\)\s*=>\s*null;?/g,
          /const\s+CanvasScroll\s*=\s*\(\)\s*=>\s*null;?/g,
          /function\s+Preloader\s*\(\)\s*\{\s*return\s+null;?\s*\}/g,
          /function\s+CanvasScroll\s*\(\)\s*\{\s*return\s+null;?\s*\}/g,
          /const\s+Preloader\s*=\s*\(\)\s*=>\s*\{\s*return\s+null;?\s*\};?/g,
          /const\s+CanvasScroll\s*=\s*\(\)\s*=>\s*\{\s*return\s+null;?\s*\};?/g,
          /\/\/ Dummy components to satisfy imports/g,
          /\/\/ Dummy components?/g,
        ];
        for (const pattern of dummyPatterns) {
          content = content.replace(pattern, '');
        }

        // Fix default to named imports
        content = content.replace(/import\s+Preloader\s+from\s+["']([^"']+)["']/g, 'import { Preloader } from "$1"');
        content = content.replace(/import\s+CanvasScroll\s+from\s+["']([^"']+)["']/g, 'import { CanvasScroll } from "$1"');
        content = content.replace(/import\s+Navbar\s+from\s+["']([^"']+)["']/g, 'import { Navbar } from "$1"');
        content = content.replace(/import\s+useStore\s+from\s+["']([^"']+)["']/g, 'import { useStore } from "$1"');

        // Fix alias paths
        content = content.replace(/@\\/components\\/Preloader/g, './components/Preloader');
        content = content.replace(/@\\/components\\/CanvasScroll/g, './components/CanvasScroll');
        content = content.replace(/@\\/store\\/useStore/g, './store/useStore');
        content = content.replace(/@\\/components\\/Navbar/g, './components/Navbar');

        // Ensure imports exist
        const requiredImports = ${videoUrl ? `[
          { name: 'Preloader', path: './components/Preloader' },
          { name: 'CanvasScroll', path: './components/CanvasScroll' },
          { name: 'useStore', path: './store/useStore' }
        ]` : `[]`};

        for (const req of requiredImports) {
          if (content.includes(req.name) && !content.includes('import { ' + req.name + ' }')) {
            content = 'import { ' + req.name + ' } from "' + req.path + '";\\n' + content;
          }
        }
        
        if (content !== originalContent) {
          changed = true;
        }
      }

      // Fix missing Lucide brand icons
      const brandIcons = ['Github', 'Twitter', 'Linkedin', 'Facebook', 'Instagram', 'Youtube'];
      let importedBrands = [];
      const importRegex = /import\\s+\\{([^}]+)\\}\\s+from\\s+["']lucide-react["']/g;
      let match;
      let newContent = content;
      while ((match = importRegex.exec(content)) !== null) {
        const fullImportStatement = match[0];
        const importedItemsStr = match[1];
        const items = importedItemsStr.split(',').map(item => item.trim());
        const remainingItems = [];
        let statementChanged = false;
        
        for (const item of items) {
          const name = item.split(/\\s+as\\s+/)[0].trim();
          if (brandIcons.includes(name)) {
            importedBrands.push(item);
            statementChanged = true;
          } else {
            remainingItems.push(item);
          }
        }
        
        if (statementChanged) {
          let replacement = '';
          if (remainingItems.length > 0) {
            replacement = \`import { \${remainingItems.join(', ')} } from "lucide-react"\`;
          }
          newContent = newContent.replace(fullImportStatement, replacement);
        }
      }
      
      if (importedBrands.length > 0) {
        let svgDeclarations = '\\n// Inject missing brand icons from older Lucide versions\\n';
        for (const item of importedBrands) {
          const parts = item.split(/\\s+as\\s+/);
          const originalName = parts[0].trim();
          const localName = parts[1] ? parts[1].trim() : originalName;
          let svgPath = '';
          if (originalName === 'Github') {
            svgPath = '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" />';
          } else if (originalName === 'Twitter') {
            svgPath = '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />';
          } else if (originalName === 'Linkedin') {
            svgPath = '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />';
          } else if (originalName === 'Facebook') {
            svgPath = '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />';
          } else if (originalName === 'Instagram') {
            svgPath = '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />';
          } else if (originalName === 'Youtube') {
            svgPath = '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />';
          }
          svgDeclarations += \`const \${localName} = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    \${svgPath}
  </svg>
);\\n\`;
        }
        newContent = newContent + svgDeclarations;
        content = newContent;
        changed = true;
      }

      // Convert absolute frame paths in assets folder first: "/assets/frame-" -> "./frame-"
      if (content.match(/(["'\\\`])\\/assets\\/frame-/g)) {
        content = content.replace(/(["'\\\`])\\/assets\\/frame-/g, '$1./frame-');
        changed = true;
      }
      // Strip assets/ prefix if import.meta.url was used
      if (content.includes('assets/frame-')) {
        content = content.replace(/assets\\/frame-/g, 'frame-');
        changed = true;
      }
      // Replace absolute paths but keep the surrounding quotes: "/frame-" -> "./frame-"
      if (content.match(/(["'\\\`])\\/frame-/g)) {
        content = content.replace(/(["'\\\`])\\/frame-/g, '$1./frame-');
        changed = true;
      }
      if (changed) fs.writeFileSync(p, content);
    }
  }
}
fixPaths(process.argv[2]);
`;
            await sandbox.files.write("/app/fix-paths.js", fixPathsScript);

            // Run pre-build to fix source files
            await sandbox.commands.run("node /app/fix-paths.js src", { timeoutMs: 15000 });

            await sandbox.commands.run("npm run build --silent -- --base=./");

            // Run post-build to fix bundled output files
            await sandbox.commands.run("node /app/fix-paths.js dist", { timeoutMs: 15000 });
          } catch (buildErr) {
            const err = buildErr as { stdout?: string, stderr?: string };
            const viteErrorLog = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
            return { success: false, error: `Vite Build Error:\n${viteErrorLog}` };
          }

          return { success: true, error: "" };
        } catch (infraErr) {
          const err = infraErr as Error;
          return { success: false, error: `Sandbox Execution Error: ${err.message || String(err)}` };
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
        model: getModel(event.data.model || "deepseek/deepseek-v4-flash"),
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
          await checkCancellation(event.data.projectId);
          if (network.state.data.summary) return;
          return fixerAgent;
        },
        defaultModel: getModel(event.data.model || "openai/gpt-oss-120b:free"),
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

      let fixPrompt = `🚨 CRITICAL BUILD FAILURE 🚨\n`;
      fixPrompt += `The build failed with these exact errors:\n\n${buildCheck.error}\n${brokenFilesContext}\n\n`;

      if (attempt >= 3) {
        fixPrompt += `⚠️ NUCLEAR OPTION TRIGGERED (Attempt ${attempt}): You have failed to fix this error multiple times. DO NOT try to solve the logic or fix the complex implementation. You MUST simply DELETE the component, element, or hook that is causing the error, or replace it with a simple empty standard HTML element (like a <div>). Your ONLY goal is to make the build pass by removing the broken code.\n\n`;
      }

      fixPrompt += `Follow your strict workflow: 1) Explain the fix, 2) Call the tool, 3) Output <task_summary>.`;

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
      model: getModel(event.data.model || "deepseek/deepseek-v4-flash"),
    });

    const responseGenerator = createAgent({
      name: `response-generator-run-${runId}`, // Ensure name is unique per run!
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: getModel(event.data.model || "deepseek/deepseek-v4-flash"),
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

      // Step 1: Write the extraction script as a file to the sandbox (avoids all quote/escape mangling)
      const extractionScript = [
        "const fs = require('fs');",
        "const path = require('path');",
        "function getFiles(dir, fileList) {",
        "  fileList = fileList || {};",
        "  if (!fs.existsSync(dir)) return fileList;",
        "  var items = fs.readdirSync(dir);",
        "  for (var i = 0; i < items.length; i++) {",
        "    var p = path.join(dir, items[i]);",
        "    if (fs.statSync(p).isDirectory()) {",
        "      getFiles(p, fileList);",
        "    } else {",
        "      var name = items[i].toLowerCase();",
        "      var isFrame = name.startsWith('frame-') && (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp') || name.endsWith('.gif'));",
        "      if (!isFrame) {",
        "        var key = p.split(path.sep).join('/').replace('dist/', '');",
        "        fileList[key] = fs.readFileSync(p).toString('base64');",
        "      }",
        "    }",
        "  }",
        "  return fileList;",
        "}",
        "process.stdout.write(JSON.stringify(getFiles('dist')));",
      ].join("\n");

      // Write it to the sandbox filesystem then execute — no shell quoting issues
      await sandbox.files.write("/app/extract-dist.js", extractionScript);
      const cmdResult = await sandbox.commands.run("node /app/extract-dist.js", { timeoutMs: 60000 });

      if (cmdResult.exitCode !== 0) {
        console.error("Failed to extract dist folder. stderr:", cmdResult.stderr);
        console.error("stdout:", cmdResult.stdout);
        throw new Error(`Failed to read dist folder: ${cmdResult.stderr || "unknown error"}`);
      }

      const files = JSON.parse(cmdResult.stdout);
      const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
      const storage = new Storage(
        process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
          ? {
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            credentials: {
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
          }
          : {
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
          }
      );

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
          const lowerPath = relativePath.toLowerCase();
          if (lowerPath.endsWith(".html")) contentType = "text/html; charset=utf-8";
          else if (lowerPath.endsWith(".js")) contentType = "application/javascript";
          else if (lowerPath.endsWith(".css")) contentType = "text/css";
          else if (lowerPath.endsWith(".svg")) contentType = "image/svg+xml";
          else if (lowerPath.endsWith(".json")) contentType = "application/json";
          else if (lowerPath.endsWith(".png")) contentType = "image/png";
          else if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) contentType = "image/jpeg";
          else if (lowerPath.endsWith(".webp")) contentType = "image/webp";
          else if (lowerPath.endsWith(".gif")) contentType = "image/gif";
          else if (lowerPath.endsWith(".ico")) contentType = "image/x-icon";
          else if (lowerPath.endsWith(".mp4")) contentType = "video/mp4";
          else if (lowerPath.endsWith(".woff")) contentType = "font/woff";
          else if (lowerPath.endsWith(".woff2")) contentType = "font/woff2";
          else if (lowerPath.endsWith(".ttf")) contentType = "font/ttf";
          else if (lowerPath.endsWith(".otf")) contentType = "font/otf";
          await bucket.file(`${sitePrefix}${relativePath}`).save(buffer, { metadata: { contentType, cacheControl: "no-cache, max-age=0" }, resumable: false });
        }));
      }

      // Step 3: Stream the frames ZIP directly from GCS (videoUrl) and re-upload each frame
      // This avoids base64-encoding 450 large images through the E2B->Node pipeline entirely.
      if (videoUrl) {
        console.log(`DEBUG: Streaming frames ZIP from GCS and re-uploading to site prefix...`);
        const JSZip = (await import("jszip")).default;
        const zipResponse = await fetch(videoUrl);
        if (!zipResponse.ok) throw new Error(`Failed to fetch frames zip: ${zipResponse.statusText}`);
        const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());
        const zip = await JSZip.loadAsync(zipBuffer);

        const frameEntries = Object.entries(zip.files).filter(([name, f]) => !f.dir && name.endsWith(".jpg"));
        const frameChunkSize = 12; // Reduced to 5 to prevent socket hang up with high-quality larger frames
        for (let i = 0; i < frameEntries.length; i += frameChunkSize) {
          const chunk = frameEntries.slice(i, i + frameChunkSize);
          await Promise.all(chunk.map(async ([name, zipEntry]) => {
            const frameBuffer = await zipEntry.async("nodebuffer");
            const meta = { metadata: { contentType: "image/jpeg" }, resumable: false };
            // Upload to root site dir (for AI code using ./frame-N.jpg relative to the page)
            // AND to assets/ subdir (for AI code using import.meta.url inside the JS bundle)
            // This guarantees frames load correctly regardless of how the AI resolves paths.
            await Promise.all([
              bucket.file(`${sitePrefix}${name}`).save(frameBuffer, meta),
              bucket.file(`${sitePrefix}assets/${name}`).save(frameBuffer, meta),
            ]);
          }));
        }
        console.log(`DEBUG: Uploaded ${frameEntries.length} frames to GCS.`);
      }

      const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
      const finalUrl = `${cdnBase}/${sitePrefix}index.html`;
      console.log(`DEBUG: GCP Deployment complete: ${finalUrl}`);
      return finalUrl;
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);

      // 1. Terminate any existing processes blocking port 3000 (prevents EADDRINUSE on rapid successive runs)
      await sandbox.commands.run("kill -9 $(lsof -t -i:3000) 2>/dev/null || true");

      if (videoUrl) {
        console.log(`DEBUG: Bootstrapping master frames sequence for Sandbox Dev Server...`);
        const devZipResult = await sandbox.commands.run(`curl -f -s -L '${videoUrl}' -o frames.zip && (unzip -q -o frames.zip -d public || python3 -m zipfile -e frames.zip public) && mkdir -p public/assets && cp public/*.jpg public/assets/ 2>/dev/null || true && rm frames.zip`);
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
                if (normalizedPath.startsWith('public/assets/frame-') && ext === '.jpg') {
                  continue; // Hide these routing duplicates from the UI
                }
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

    await step.run("charge-credits", async () => {
      const model = event.data.model || "deepseek/deepseek-v4-flash";
      const cost = MODEL_COSTS[model] || 100;
      await consumeCredits(cost, event.data.userId);
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
  { id: "veo-generate", retries: 0, timeouts: { finish: "15m" } },
  { event: "veo/generate" },
  async ({ event, step }) => {
    const { projectId, prompt, model, userId } = event.data;
    const cost = MODEL_COSTS[model as string] || 25;

    try {
      await step.run("update-project-stage-generating", async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "GENERATING_VIDEO" }
        });
      });

      const videoUri = await step.run("generate-video", async () => {
        let base64VideoData: string | null = null;
        let finalVideoUrl: string | null = null;

        if (model.includes("replicate-") || model === "bytedance/seedance-1.5-pro") {
          const Replicate = (await import("replicate")).default;
          const replicate = new Replicate({
            auth: process.env.REPLICATE_API_KEY!,
          });

          let targetModel: `${string}/${string}` = "kwaivgi/kling-v2.5-turbo-pro"; // default fallback
          if (model === "replicate-kling-v2.5-turbo-pro") {
            targetModel = "kwaivgi/kling-v2.5-turbo-pro";
          } else if (model === "replicate-prunaai/p-video-draft") {
            targetModel = "prunaai/p-video";
          } else if (model.includes("/")) {
            targetModel = model.replace("replicate-", "") as `${string}/${string}`;
          }

          const input: Record<string, unknown> = { prompt };

          if (targetModel === "prunaai/p-video") {
            input.fps = 24;
            input.draft = model === "replicate-prunaai/p-video-draft";
            input.no_op = false;
            input.duration = 4;
            input.resolution = "720p";
            input.save_audio = false;
            input.aspect_ratio = "16:9";
            input.prompt_upsampling = false;
            input.disable_safety_filter = true;

            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.last_frame_image = event.data.endImageUrl;
            }
          } else if (targetModel === "bytedance/seedance-1.5-pro") {
            input.fps = 24;
            input.duration = 4;
            input.resolution = "720p";
            input.aspect_ratio = "16:9";
            input.camera_fixed = false;
            input.generate_audio = false; // Usually it's better to default to false unless explicitly needed
            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.last_frame_image = event.data.endImageUrl;
            }
          } else if (targetModel === "kwaivgi/kling-v2.5-turbo-pro") {
            input.duration = 5;
            input.aspect_ratio = "16:9";
            if (event.data.imageUrl) {
              input.start_image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.end_image = event.data.endImageUrl;
            }
          } else {
            // Generic fallback for other models
            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
              input.start_image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.end_image = event.data.endImageUrl;
            }
          }

          console.log(`[Video Pipeline] Starting Replicate model: ${targetModel}`);

          // Use predictions.create + poll to avoid non-serializable FileRef objects
          // replicate.run() may return FileRef objects that crash Inngest's JSON step serialization
          const prediction = await replicate.predictions.create({
            model: targetModel,
            input,
          });

          console.log(`[Video Pipeline] Prediction created: ${prediction.id}, polling...`);

          // Poll until completed or failed
          let completedPrediction = prediction;
          const maxWaitMs = 5 * 60 * 1000; // 5 min timeout
          const startTime = Date.now();
          while (
            completedPrediction.status !== "succeeded" &&
            completedPrediction.status !== "failed" &&
            completedPrediction.status !== "canceled"
          ) {
            if (Date.now() - startTime > maxWaitMs) {
              throw new Error(`Replicate prediction ${prediction.id} timed out after 5 minutes`);
            }
            await new Promise((r) => setTimeout(r, 5000));
            completedPrediction = await replicate.predictions.get(prediction.id);
            console.log(`[Video Pipeline] Prediction status: ${completedPrediction.status}`);
          }

          if (completedPrediction.status !== "succeeded") {
            throw new Error(`Replicate prediction failed: ${JSON.stringify(completedPrediction.error)}`);
          }

          // Extract URL as a plain string — no FileRef objects allowed here
          const rawOutput = completedPrediction.output;
          const outputItem = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

          if (outputItem && typeof outputItem === "object" && typeof (outputItem as { url?: () => string }).url === "function") {
            finalVideoUrl = (outputItem as { url: () => string }).url().toString();
          } else if (typeof outputItem === "string") {
            finalVideoUrl = outputItem;
          } else if (outputItem && typeof outputItem === "object" && "url" in outputItem) {
            // Handle plain URL objects from newer Replicate SDK versions
            finalVideoUrl = String((outputItem as { url: string }).url);
          }

          if (!finalVideoUrl) {
            throw new Error(`Invalid Replicate output: ${JSON.stringify(rawOutput)}`);
          }

          // Fetch the video buffer to upload to GCS
          const res = await fetch(finalVideoUrl);
          if (!res.ok) throw new Error(`Failed to download Replicate video: ${res.statusText}`);
          const arrayBuffer = await res.arrayBuffer();
          base64VideoData = Buffer.from(arrayBuffer).toString("base64");

        } else if (model.includes("openrouter-")) {
          let actualModel = model.replace("openrouter-", "");
          if (actualModel === "seedance-2") {
            actualModel = "bytedance/seedance-2.0";
          } else if (actualModel === "seedance-2-fast") {
            actualModel = "bytedance/seedance-2.0-fast";
          }
          console.log(`[Video Pipeline] Starting OpenRouter video model: ${actualModel}`);

          const frame_images = [];
          if (event.data.imageUrl) {
            frame_images.push({
              type: "image_url",
              image_url: { url: event.data.imageUrl },
              frame_type: "first_frame"
            });
          }
          if (event.data.endImageUrl) {
            frame_images.push({
              type: "image_url",
              image_url: { url: event.data.endImageUrl },
              frame_type: "last_frame"
            });
          }

          const res = await fetch("https://openrouter.ai/api/v1/videos", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: actualModel,
              prompt: prompt,
              audio: false,
              generate_audio: false, // Added as fallback for different providers
              ...(frame_images.length > 0 ? { frame_images } : {})
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(`OpenRouter Error: ${JSON.stringify(data)}`);

          const pollingUrl = data.polling_url;
          if (!pollingUrl) throw new Error(`OpenRouter returned no polling URL: ${JSON.stringify(data)}`);

          console.log(`[Video Pipeline] Polling OpenRouter: ${pollingUrl}`);

          while (true) {
            const pollResponse = await fetch(pollingUrl, {
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              },
            });
            const statusData = await pollResponse.json();

            if (statusData.status === "completed") {
              const urls = statusData.unsigned_urls ?? [];
              if (urls.length === 0) {
                throw new Error("OpenRouter completed but returned no video URLs.");
              }
              finalVideoUrl = urls[0];
              break;
            }

            if (statusData.status === "failed") {
              throw new Error(`OpenRouter Generation Failed: ${statusData.error ?? "Unknown error"}`);
            }

            // Wait 5 seconds before polling again
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }

          // Fetch the video buffer to upload to GCS
          const videoRes = await fetch(finalVideoUrl!, {
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
          });
          if (!videoRes.ok) throw new Error(`Failed to download OpenRouter video: ${videoRes.statusText}`);
          const arrayBuffer = await videoRes.arrayBuffer();
          base64VideoData = Buffer.from(arrayBuffer).toString("base64");
        } else if (model.includes("gcp-")) {
          console.log(`[Video Pipeline] Starting GCP Vertex model: ${model}`);
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({
            project: process.env.GOOGLE_CLOUD_PROJECT || "spatial-492511",
            location: "us-central1",
            vertexai: true,
          });


          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const source: any = { prompt };

          if (event.data.imageUrl) {
            const imgRes = await fetch(event.data.imageUrl);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              source.image = {
                imageBytes: Buffer.from(arrayBuf).toString("base64"),
                mimeType: imgRes.headers.get("content-type") || "image/png"
              };
            }
          }

          if (event.data.endImageUrl) {
            const endImgRes = await fetch(event.data.endImageUrl);
            if (endImgRes.ok) {
              const arrayBuf = await endImgRes.arrayBuffer();
              // Pass as endImage (might be passed through by SDK if supported)
              source.endImage = {
                imageBytes: Buffer.from(arrayBuf).toString("base64"),
                mimeType: endImgRes.headers.get("content-type") || "image/png"
              };
            }
          }

          let operation = await ai.models.generateVideos({
            model: "veo-3.1-lite-generate-001",
            source: source,
            config: {
              aspectRatio: "16:9",
              personGeneration: "allow_all",
              generateAudio: false,
              resolution: "720p",
            }
          });

          console.log(`[Video Pipeline] GCP operation created: ${operation.name}, polling...`);

          while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (ai.operations && ai.operations.get) {
              operation = await ai.operations.get({ operation });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if (typeof (ai.models as any).getVideosOperation === "function") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              operation = await (ai.models as any).getVideosOperation({ operation });
            } else {
              throw new Error("Cannot poll operation, missing API method in @google/genai");
            }
          }

          const response = operation.response;
          if (!response || !response.generatedVideos || response.generatedVideos.length === 0) {
            throw new Error("No videos generated by GCP Veo.");
          }

          const videoItem = response.generatedVideos[0].video;
          if (!videoItem) throw new Error("GCP Veo did not return a valid video item.");

          if (videoItem.videoBytes) {
            base64VideoData = Buffer.from(videoItem.videoBytes, "base64").toString("base64");
          } else if (videoItem.uri) {
            const videoRes = await fetch(videoItem.uri);
            if (!videoRes.ok) throw new Error(`Failed to download GCP video: ${videoRes.statusText}`);
            const arrayBuffer = await videoRes.arrayBuffer();
            base64VideoData = Buffer.from(arrayBuffer).toString("base64");
          } else {
            throw new Error("GCP Veo did not return video bytes or uri");
          }
        } else {
          throw new Error(`Unsupported model: ${model}`);
        }

        if (!base64VideoData) throw new Error("No video data retrieved");

        console.log(`[Video Pipeline] Pushing Video to GCS natively to bypass node limits...`);
        const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
        const { Storage } = await import("@google-cloud/storage");
        const storage = new Storage(
          process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
            ? {
              projectId: process.env.GOOGLE_CLOUD_PROJECT,
              credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              },
            }
            : {
              projectId: process.env.GOOGLE_CLOUD_PROJECT,
            }
        );

        const bucket = storage.bucket(bucketName);
        const finalOutputName = `videos/project-${event.data.projectId}-final-${Date.now()}.mp4`;
        const fileFinal = bucket.file(finalOutputName);

        const bufferFinal = Buffer.from(base64VideoData, 'base64');
        await fileFinal.save(bufferFinal, { metadata: { contentType: "video/mp4" } });

        const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
        return `${cdnBase}/${finalOutputName}`;
      });

      await step.run("update-project-video-url", async () => {
        const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingUrls = Array.isArray((existingProject as any)?.videoUrls) ? (existingProject as any).videoUrls as unknown[] : [];

        const newVideoEntry = { url: videoUri, blockIndex: event.data.blockIndex || 0 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.project as any).update({
          where: { id: projectId },
          data: {
            videoUrls: [...existingUrls, newVideoEntry],
            currentStage: "VIDEO"
          }
        });
      });

      await step.run("charge-credits", async () => {
        await consumeCredits(cost, userId);
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
      });

      throw error;
    }
  }
);
