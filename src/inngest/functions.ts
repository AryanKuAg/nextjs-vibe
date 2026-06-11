import { z } from "zod";
import { createAgent, createTool, createNetwork, type Tool, type Message, createState, openai } from "@inngest/agent-kit";
//
import { prisma } from "@/lib/db";
import { FIXER_PROMPT, FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT, ARCHITECT_PROMPT } from "@/prompt";
import { templateManifests } from "@/registry/components";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { SANDBOX_TIMEOUT } from "./types";
import { parseAgentOutput, lastAssistantTextMessageContent } from "./utils";

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
      } else {
        // Enforce golden templates on follow-ups to keep them synced and prevent dummy components
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
        messages: previousMessages,
      },
    );


    const runId = event.id ? event.id.slice(0, 8) : Math.random().toString(36).substring(2, 10);

    // Factory to generate tools with safe, deterministic, auto-incrementing step IDs
    const getToolsForAgent = (prefix: string) => {
      let readFilesCount = 0;
      let createFilesCount = 0;

      return [
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the project",
          parameters: z.object({
            files: z.array(z.object({ path: z.string(), content: z.string() })),
          }),
          handler: async ({ files }, { network, step }: Tool.Options<AgentState>) => {
            createFilesCount++;

            const updatedFiles = await step?.run(`createFiles-${prefix}-call-${createFilesCount}`, async () => {
              try {
                const updated: Record<string, string> = {};

                const PROTECTED_FILES = [
                  "src/components/CanvasScroll.tsx",
                  "src/components/Preloader.tsx",
                  "src/store/useStore.ts",
                  "src/constants/frames.ts",
                  "src/components/headers/DotNav.tsx",
                  "src/components/headers/FullWidthNav.tsx",
                  "src/components/headers/PillNav.tsx",
                ];

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
                  if (file.path === "src/App.tsx") {
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
          description: "Read files from the project",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { network, step }) => {
            readFilesCount++;
            return await step?.run(`readFiles-${prefix}-call-${readFilesCount}`, async () => {
              try {
                const contents = [];
                for (const file of files) {
                  // Read from the agent's current state instead of sandbox
                  const content = network?.state.data.files[file] || "File not found";
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
        model: getModel(event.data.model || "gemini-3.1-pro-preview"),
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
3. CHOOSE A HEADER: You can modify \`src/components/Navbar.tsx\` to match the site's brand, OR you can completely replace it by importing one of the templates from \`src/components/headers/\` into \`src/App.tsx\` (e.g. use \`DotNav\` or \`FullWidthNav\` instead if it fits the vibe better!). You have full creative freedom over the navigation design.
4. **ANIMATION RULE (CRITICAL)**: Do NOT use complex \`useScroll\` mappings or global \`scrollYProgress\` with hardcoded arrays (e.g. \`[0, 0.2, 0.5]\`). You will get the math wrong and cause sections to disappear! Instead, simply use Framer Motion's \`whileInView={{ opacity: 1, y: 0 }}\` and \`initial={{ opacity: 0, y: 50 }}\` on your components. Let standard CSS document flow handle the scroll position!
5. **LAYOUT & SPACING (CRITICAL)**: Do NOT build massive centered cards or huge solid blocks that obscure the background! The background video canvas is the star of the show. Mostly create edge-aligned, minimalist typographic content (e.g., text aligned to the left/right edges, bottom corners). 
6. **SECTION COUNT**: Generate exactly 4 to 5 sections (Hero, Features, Details, Footer). Make sure each section has a generous \`min-h-[100vh]\` to give the user a long, satisfying scroll experience to scrub through the background video. The footer MUST be the final section so it sits at the absolute bottom of the scroll.
7. **CRITICAL FOREGROUND RULE**: ALL normal sections (Hero, Features, Pricing, Footer) MUST HAVE COMPLETELY TRANSPARENT BACKGROUNDS! Do NOT use \`bg-black\`, \`bg-white\`, or \`bg-background\` on any of your main page wrappers. Use glassmorphism (e.g. \`bg-black/40 backdrop-blur-md\`) ONLY if you strictly need readable contrast for text.
8. **OVERLAY & BODY PROHIBITION (CRITICAL)**: NEVER set a background color on \`html\`, \`body\`, or \`#root\` in your CSS or HTML. NEVER add any \`<div>\` or \`<section>\` with a solid or semi-opaque background color (\`bg-black\`, \`bg-black/80\`, \`bg-gray-900\`, \`background: rgba(0,0,0,X)\`, etc.) that spans full-width or full-height and sits on top of the canvas. The canvas images MUST ALWAYS be fully visible.
9. **BRANDING**: You MUST update \`index.html\` to have a \`<title>\` that matches the generated site's name (not "Vite + React + TS"). You MUST also replace the default Vite favicon with a relevant emoji encoded as an SVG data URI in the \`<link rel="icon">\` tag.
10. **CRITICAL IMPORT RULE**: You MUST use relative imports based on the file's location. For example, inside \`src/App.tsx\` use \`./components/Navbar.tsx\` or \`./components/headers/FullWidthNav\`. Inside \`src/components/sections/Hero.tsx\` use \`../Navbar.tsx\`. NEVER use \`@/\` alias imports! The build system does NOT have \`@/\` configured and it will fail to compile. Also, ensure you use the terminal tool to run \`npm install zustand framer-motion lucide-react\` so the provided templates work!
11. **STRICT REACT RULES (CRITICAL)**: To prevent Minified React Error #321, NEVER define a component function inside another component function. NEVER call hooks conditionally or inside loops. Ensure all components are standard React functions.
12. **RICH CONTENT (CRITICAL)**: Generate highly detailed, copy-rich sections with variant content. Do not output just a minimal title and subtitle. You MUST generate at least 500 words of realistic content. Add features, bullet points, grids, statistics, testimonials, detailed pricing tiers, and dense paragraph text so the layout feels like a complete, premium, scrollable website. Do not build minimal sites!
13. **TRANSPARENCY REITERATION**: The background canvas is the primary visual! Ensure that \`src/App.tsx\` and ALL your sections use transparent backgrounds. Any solid background color will hide the animation and result in failure!
14. **LOCKED FILES (CRITICAL)**: The following files are strictly locked and your modifications to them will be automatically REJECTED by the system:
    - \`src/components/CanvasScroll.tsx\`
    - \`src/components/Preloader.tsx\`
    - \`src/store/useStore.ts\`
    - \`src/constants/frames.ts\`
    - \`src/components/headers/DotNav.tsx\`, \`FullWidthNav.tsx\`, \`PillNav.tsx\`
    DO NOT attempt to modify these files. DO NOT recreate them.

When modifying \`src/App.tsx\`, you MUST PRESERVE the \`<Preloader />\` and \`<CanvasScroll />\` components exactly as they were provided. Do NOT remove them from the layout! Just focus on injecting your sections into the \`<main>\` tag!
=== END TEMPLATE ARCHITECTURE INSTRUCTION ===

` + currentPrompt;
    }

    // Inject image reference into the prompt when a user attaches an image
    if (event.data.imageUrl) {
      currentPrompt = `[The user has attached a reference image. Use it as a visual guide for the design, layout, color palette, and style of the generated website.]\n\nReference image URL: ${event.data.imageUrl}\n\n` + currentPrompt;
    }

    // --- 1. ARCHITECT ROUTING (The Planner) ---
    console.log('DEBUG: Running Architect agent...');
    
    // Parse frontmatter of all registered templates
    const registryManifest = [];
    const templateDataMap: Record<string, { dir: string, content: string }> = {};

    for (const templateDir of templateManifests) {
      try {
        const absoluteDir = path.join(process.cwd(), templateDir);
        const readmePath = path.join(absoluteDir, "README.md");
        if (fs.existsSync(readmePath)) {
          const rawReadme = fs.readFileSync(readmePath, "utf-8");
          const parsed = matter(rawReadme);
          const id = parsed.data.id;
          const description = parsed.data.description;
          if (id && description) {
            registryManifest.push({ id, description });
            templateDataMap[id] = { dir: absoluteDir, content: parsed.content };
          }
        }
      } catch (err) {
        console.error(`DEBUG: Failed to parse template at ${templateDir}:`, err);
      }
    }

    let architectPromptText = `User Prompt: ${event.data.value}\n\nRegistry Manifest: ${JSON.stringify(registryManifest, null, 2)}`;
    if (event.data.videoUrl) {
      architectPromptText += `\n\nCRITICAL SYSTEM REQUIREMENT: A videoUrl is present (${event.data.videoUrl}). You MUST include a video background handling component.`;
    }

    const architectAgent = createAgent({
      name: `architect-agent-run-${runId}`,
      description: "A component routing architect",
      system: ARCHITECT_PROMPT,
      model: getModel(event.data.model || "gemini-3.1-pro-preview"),
    });

    const architectResult = await architectAgent.run(architectPromptText);
    const architectOutput = parseAgentOutput(architectResult.output) || "[]";
    console.log('DEBUG: Architect Output:', architectOutput);
    
    let injectedComponentsSpec = "";
    
    try {
      // Find JSON array in the response (in case the AI wraps it in markdown)
      const match = architectOutput.match(/\\[[\\s\\S]*\\]/);
      const jsonStr = match ? match[0] : architectOutput;
      const selectedIds = JSON.parse(jsonStr);

      if (Array.isArray(selectedIds) && selectedIds.length > 0) {
        let componentDocs = "";
        
        for (const id of selectedIds) {
          const template = templateDataMap[id];
          if (template) {
            // 1. Recursive file injection
            const getAllFilesRecursive = (dirPath: string, arrayOfFiles: {path: string, content: string}[] = []) => {
              const files = fs.readdirSync(dirPath);
              files.forEach((file) => {
                const fullPath = path.join(dirPath, file);
                if (fs.statSync(fullPath).isDirectory()) {
                  arrayOfFiles = getAllFilesRecursive(fullPath, arrayOfFiles);
                } else if (file !== "README.md") { // Skip injecting README.md into the sandbox
                  arrayOfFiles.push({
                    path: fullPath,
                    content: fs.readFileSync(fullPath, "utf-8")
                  });
                }
              });
              return arrayOfFiles;
            };

            const filesToInject = getAllFilesRecursive(template.dir);
            for (const file of filesToInject) {
              // Calculate relative path inside the template directory
              const relativePath = path.relative(template.dir, file.path);
              // Inject to src/components/[id]/[relativePath]
              const sandboxPath = `src/components/${id}/${relativePath}`;
              state.data.files[sandboxPath] = file.content;
            }
            
            // 2. Add the README instructions to the Builder prompt
            componentDocs += `${template.content}\n\n---\n\n`;
          }
        }

        if (componentDocs) {
          injectedComponentsSpec = `
[SYSTEM PROMPT INJECTION: PRE-BUILT COMPONENTS]
You are an expert frontend developer. To accelerate development, I have pre-injected the following custom components into your workspace (they already exist in your file system). 
**You MUST use them if they fit the user's request.** Do not try to recreate this functionality from scratch.

${componentDocs}

**Task:** Read the user's request. Write \`src/App.tsx\` and any other necessary files to fulfill it. If the pre-injected components are relevant to the user's request, use them as documented above to save time. If the user is asking for something completely different, ignore the components and build it from scratch exactly as requested.
`;
        }
      }
    } catch (err) {
      console.error("DEBUG: Failed to process Architect response:", err);
    }

    // Replace the placeholder in the main prompt
    currentPrompt = currentPrompt.replace("[SYSTEM PROMPT INJECTION PLACEHOLDER]", injectedComponentsSpec);



    // --- 2. INITIAL GENERATION (The Creator) ---
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
      defaultModel: getModel(event.data.model || "gemini-3.1-pro-preview"),
    });

    console.log('DEBUG: Running initial Creator agent...');
    const result = await initialNetwork.run(currentPrompt, { state });

    finalSummary = result.state.data.summary || "";
    finalFiles = result.state.data.files;

    if (!finalSummary) {
      console.error("DEBUG: AI returned no summary. Halting.");
      finalSummary = "Task completed.";
    }

    const fragmentTitleGenerator = createAgent({
      name: `fragment-title-generator-run-${runId}`,
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: getModel(event.data.model || "gemini-3.1-pro-preview"),
    });

    const responseGenerator = createAgent({
      name: `response-generator-run-${runId}`,
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: getModel(event.data.model || "gemini-3.1-pro-preview"),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(finalSummary);
    const { output: responseOutput } = await responseGenerator.run(finalSummary);

    await step.run("save-result", async () => {
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseAgentOutput(responseOutput) || finalSummary,
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: "",
              deploymentUrl: null,
              title: parseAgentOutput(fragmentTitleOutput) || "Project Updated",
              files: finalFiles || {},
            },
          },
        },
      });
    });

    await step.run("charge-credits", async () => {
      const model = event.data.model || "gemini-3.1-pro-preview";
      const cost = MODEL_COSTS[model] || 100;
      await consumeCredits(cost, event.data.userId);
    });

    return {
      url: "",
      deploymentUrl: null,
      sandboxUrl: "",
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

        if (model.includes("replicate-")) {
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
