import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import { createAgent, createTool, createNetwork, type Tool, type Message, createState, openai } from "@inngest/agent-kit";
//
import { prisma } from "@/lib/db";
import { FIXER_PROMPT, FRAGMENT_TITLE_PROMPT, RESPONSE_PROMPT, buildCodeAgentSystemPrompt, type CodeAgentMode } from "@/prompt";

import { inngest } from "./client";
import { SANDBOX_TIMEOUT } from "./types";
import { getSandbox, parseAgentOutput, lastAssistantTextMessageContent } from "./utils";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, isR2Configured, r2PublicBase, contentTypeFor, R2_BUCKET_NAME, r2PublicUrlLooksLikeApiEndpoint } from "@/lib/r2";


import { consumeCredits, MODEL_COSTS } from "@/lib/usage";

// Constants moved to usage.ts



const checkCancellation = async (projectId: string) => {
  const pCheck = await prisma.project.findUnique({
    where: { id: projectId },
    select: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (pCheck?.messages?.[0]?.content === "Generation was manually stopped.") {
    return true;
  }
  return false;
};



interface AgentState {
  summary: string;
  files: { [path: string]: string };
};

// Scaffold App.tsx used when the site has NO full-page scroll video (hero-only
// and standard modes). The default template App.tsx imports ScrollFrames, which
// is deliberately not seeded in these modes — seeding it would not compile.
const NON_FULL_PAGE_APP_SEED = `// @ts-nocheck
import { Navbar } from "./components/Navbar";

import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Details } from "./components/sections/Details";
import { Footer } from "./components/sections/Footer";

export default function App() {
  return (
    <>
      <Navbar />

      <main className="w-full relative z-10 flex flex-col">
        <Hero />
        <Features />
        <Details />
        <Footer />
      </main>
    </>
  );
}
`;

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

    // --- VIDEO & MODE DERIVATION ---
    // The event payload is not trusted as the only source: follow-up events may
    // arrive without videoUrl/experiencePref (or with videoUrls entries that are
    // {url, blockIndex} objects). We derive the durable truth from the project
    // row and the latest fragment so iterations never lose the video wiring.
    const videoContext = await step.run("derive-video-context", async () => {
      const normalizeUrl = (v: unknown): string | undefined => {
        if (typeof v === "string" && v.trim() !== "") return v;
        if (v && typeof v === "object" && "url" in v && typeof (v as { url: unknown }).url === "string") {
          return (v as { url: string }).url;
        }
        return undefined;
      };

      let videoUrl = normalizeUrl(event.data.videoUrl);
      if (!videoUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stored = (project as any)?.videoUrls;
        const urls = Array.isArray(stored) ? stored : [];
        videoUrl = normalizeUrl(urls[urls.length - 1]);
      }

      let experiencePref: string | undefined = event.data.experiencePref;
      if (!experiencePref && latestFragment) {
        // Derive from the built site itself: full-page sites always carry the
        // protected ScrollFrames component; hero sites have a video but no ScrollFrames.
        const files = (latestFragment.files || {}) as Record<string, string>;
        if (files["src/components/ScrollFrames.tsx"]) {
          experiencePref = "FULL_PAGE";
        } else if (videoUrl) {
          experiencePref = "HERO_ONLY";
        }
      }

      const mode: CodeAgentMode = !videoUrl
        ? "STANDARD"
        : experiencePref === "HERO_ONLY" ? "HERO_ONLY" : "FULL_PAGE";

      console.log(`DEBUG: Derived video context — mode: ${mode}, videoUrl: ${videoUrl ? "present" : "none"}`);
      return { videoUrl: videoUrl ?? null, mode };
    });

    const videoUrl = videoContext.videoUrl;
    const mode = videoContext.mode as CodeAgentMode;
    const isNewBuild = !latestFragment;

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
              // ScrollFrames only exists in full-page mode — hero uses a plain
              // <video>, standard has no video, and an unseeded video URL
              // placeholder would render a broken player.
              if (relativePath === "components/ScrollFrames.tsx" && mode !== "FULL_PAGE") {
                continue;
              }
              let content = fs.readFileSync(fullPath, "utf-8");
              if (relativePath === "components/ScrollFrames.tsx" && videoUrl) {
                content = content.replaceAll("VIDEO_URL_HERE", videoUrl);
              }
              // Without ScrollFrames, the default App.tsx would not compile —
              // seed a variant that skips the import.
              if (relativePath === "App.tsx" && mode !== "FULL_PAGE") {
                content = NON_FULL_PAGE_APP_SEED;
              }
              files[`src/${relativePath}`] = content;
            }
          }
        };
        readDirRecursive(templatesDir);

      } else if (mode === "FULL_PAGE" && videoUrl) {
        // Existing project: always refresh the platform-owned golden ScrollFrames
        // so template fixes propagate to old projects — the code agent is blocked
        // from editing this file, so this is the only upgrade path.
        const goldenPath = path.join(templatesDir, "components", "ScrollFrames.tsx");
        if (fs.existsSync(goldenPath)) {
          files["src/components/ScrollFrames.tsx"] =
            fs.readFileSync(goldenPath, "utf-8").replaceAll("VIDEO_URL_HERE", videoUrl);
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

        // Even on a hot sandbox, sync the platform-owned golden ScrollFrames so
        // template fixes reach projects whose sandbox never went cold.
        const golden = filesObj["src/components/ScrollFrames.tsx"];
        if (typeof golden === "string" && mode === "FULL_PAGE") {
          try {
            const sandbox = await getSandbox(sandboxId);
            await writeSandboxFile(sandbox, "src/components/ScrollFrames.tsx", golden);
          } catch (e) {
            console.error("DEBUG: Failed to refresh ScrollFrames on hot sandbox", e);
          }
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


      console.log(`DEBUG: Hydrated ${written} files into sandbox.`);
    });

    const previousMessages = await step.run("get-previous-messages", async () => {
      // History hygiene: only real conversational turns reach the model.
      // Interactive button payloads, empty progress markers, infra errors, and
      // the duplicated current prompt would derail a lightweight model.
      const messages = await prisma.message.findMany({
        where: {
          projectId: event.data.projectId,
          type: "RESULT",
          content: { not: "" },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      const isNoise = (content: string) =>
        content.startsWith("The code agent encountered a critical infrastructure error") ||
        content.startsWith("Autonomous agent encountered an error") ||
        content === "Generation was manually stopped.";

      const formattedMessages: Message[] = [];
      let skippedCurrentPrompt = false;

      for (const message of messages) {
        let content = message.content.trim();
        if (!content || isNoise(content)) continue;

        // The newest USER message is the prompt currently being processed — it
        // is already in the task input; including it twice confuses the model.
        if (!skippedCurrentPrompt && message.role === "USER" && content === event.data.value?.trim()) {
          skippedCurrentPrompt = true;
          continue;
        }

        content = content.replace(/<\/?task_summary>/g, "").trim();
        if (content.length > 1500) content = content.slice(0, 1500) + " …[truncated]";

        formattedMessages.push({
          type: "text",
          role: message.role === "ASSISTANT" ? "assistant" : "user",
          content,
        });

        if (formattedMessages.length >= 4) break;
      }

      return formattedMessages.reverse();
    });

    const state = createState<AgentState>(
      {
        summary: "",
        files: initialFiles as Record<string, string>,
      },
      {
        messages: previousMessages as Message[],
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
          name: "editFiles",
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

                const PROTECTED_FILES = mode === "FULL_PAGE" ? [
                  "src/components/ScrollFrames.tsx",
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
                  if (mode === "FULL_PAGE" && file.path === "src/App.tsx") {
                    const c = file.content;
                    if (!c.includes("<ScrollFrames") && !c.includes("ScrollyVideo")) {
                      throw new Error("CRITICAL ARCHITECTURE ERROR: You removed <ScrollFrames /> from App.tsx. You MUST include it as the first child.");
                    }
                    if (/\{\/\*\s*<ScrollFrames/i.test(c) || /\/\/\s*import.*ScrollFrames/i.test(c)) {
                      throw new Error("CRITICAL ARCHITECTURE ERROR: You commented out ScrollFrames in App.tsx. Do NOT comment it out.");
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

    // The system prompt is assembled per mode — one voice, no conflicting layers.
    const systemPrompt = buildCodeAgentSystemPrompt(mode, videoUrl);

    // Factory function: creates an agent with unique name and step IDs per attempt.
    const createCodeAgentForAttempt = (attemptIndex: number, iterIndex: number = 0) => {
      return createAgent<AgentState>({
        name: `code-agent-run-${runId}-attempt-${attemptIndex}-iter-${iterIndex}`,
        description: "An expert coding agent",
        system: systemPrompt,
        model: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
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

    let finalSummary = "";
    let finalFiles = state.data.files;

    // --- TASK INPUT ASSEMBLY ---
    // The mode-specific rules live in the system prompt. The task input is just:
    // the Build Brief (new builds) or the change request (iterations), plus the
    // current file contents — clearly framed for each case.
    const renderFiles = (files: Record<string, string>) => {
      let out = "";
      for (const [path, content] of Object.entries(files)) {
        if (path.includes('package-lock.json') || path.includes('node_modules')) continue;
        out += `--- ${path} ---\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
      return out;
    };

    let currentPrompt: string;
    if (isNewBuild) {
      currentPrompt = `${event.data.value}\n\n`;
      currentPrompt += `=== STARTER SCAFFOLD (current project files) ===\n`;
      currentPrompt += `This is a BRAND NEW project. The files below are a generic scaffold seeded by the platform — their copy, styling, and section content are PLACEHOLDERS.\n`;
      currentPrompt += `You MUST replace the placeholder content of App.tsx, index.css, index.html, and every section/component so the finished site matches the brief above. Keep the structural wiring intact` +
        (mode === "FULL_PAGE" ? ` (in particular: <ScrollFrames /> stays the first child of App.tsx — never modify or recreate ScrollFrames itself)` : "") + `.\n\n`;
      currentPrompt += renderFiles(initialFiles as Record<string, string>);
      currentPrompt += `=== END STARTER SCAFFOLD ===`;
    } else {
      currentPrompt = `=== CHANGE REQUEST ===\n${event.data.value}\n=== END CHANGE REQUEST ===\n\n`;
      currentPrompt += `=== CURRENT PROJECT STATE ===\n`;
      currentPrompt += renderFiles(initialFiles as Record<string, string>);
      currentPrompt += `=== END PROJECT STATE ===\n\n`;
      currentPrompt += `You are updating the existing project above based on the change request. ONLY modify the specific files that require changes via editFiles. Do NOT rewrite the entire application. Keep the existing design, components, and structure intact unless the request explicitly asks to change them.`;
    }

    // (Mode-specific video/architecture rules live in the system prompt — no patches here.)

    // Inject image reference into the prompt when a user attaches an image
    if (event.data.imageUrl) {
      currentPrompt = `[The user has attached a reference image. Use it as a visual guide for the design, layout, color palette, and style of the generated website.]\n\nReference image URL: ${event.data.imageUrl}\n\n` + currentPrompt;
    }

    // --- 1. INITIAL GENERATION (The Creator) ---
    const initialAgent = createCodeAgentForAttempt(0, 0);
    const initialNetwork = createNetwork<AgentState>({
      name: `coding-agent-network-run-${runId}-initial`,
      agents: [initialAgent],
      maxIter: 8,
      defaultState: state,
      router: async ({ network }) => {
        if (await checkCancellation(event.data.projectId)) return;
        // If we have a summary, we are done! Return nothing to stop the loop.
        if (network.state.data.summary) return;
        return initialAgent; // Otherwise, run the agent
      },
      defaultModel: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
    });

    console.log('DEBUG: Running initial Creator agent...');
    let result = await initialNetwork.run(currentPrompt, { state });
    if (await checkCancellation(event.data.projectId)) return { status: 'manually_stopped' };

    // --- VERIFICATION: the agent must have actually changed something. ---
    // A lazy model can emit a task summary without a single tool call; the seeded
    // scaffold compiles, so without this check the untouched template would ship
    // as a "success". One corrective re-run before we accept the result.
    const seedFiles = initialFiles as Record<string, string>;
    const hasRealChanges = (files: Record<string, string> | undefined) =>
      Object.entries(files || {}).some(([p, c]) => seedFiles[p] !== c);

    if (!hasRealChanges(result.state.data.files)) {
      console.warn("DEBUG: Creator agent made no file changes. Running one corrective attempt...");
      const retryState = createState<AgentState>(
        { summary: "", files: state.data.files },
        { messages: previousMessages as Message[] },
      );
      const retryAgent = createCodeAgentForAttempt(0, 1);
      const retryNetwork = createNetwork<AgentState>({
        name: `coding-agent-network-run-${runId}-retry`,
        agents: [retryAgent],
        maxIter: 8,
        defaultState: retryState,
        router: async ({ network }) => {
          if (await checkCancellation(event.data.projectId)) return;
          if (network.state.data.summary) return;
          return retryAgent;
        },
        defaultModel: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
      });

      const correctivePrompt = currentPrompt +
        `\n\n⚠️ PREVIOUS ATTEMPT FAILED: you finished without writing any files. That is not acceptable — the ${isNewBuild ? "scaffold placeholders MUST be replaced with the brief's content" : "requested change MUST be applied"}. Call the editFiles tool now with the actual file contents, THEN print the task summary.`;

      result = await retryNetwork.run(correctivePrompt, { state: retryState });
      if (await checkCancellation(event.data.projectId)) return { status: 'manually_stopped' };
      state.data.files = result.state.data.files;
    }

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
      if (await checkCancellation(event.data.projectId)) return { status: 'manually_stopped' };
      // Step A: Check the build
      const buildCheck = await step.run(`verify-build-run-${runId}-attempt-${attempt}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          try {
            await sandbox.commands.run("rm -rf dist");
          } catch (e) {
            console.error("DEBUG: rm -rf dist failed", e);
          }

          console.log(`DEBUG: Running automated pre-fixes (Attempt ${attempt})...`);
          // Deterministic source fixes run BEFORE the type check so the fixer
          // agent is only invoked for errors the scripts cannot repair.
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

      // Fix CSS unresolvable imports (like bootstrap-icons)
      if (p.endsWith('.css')) {
        let originalContent = content;
        content = content.replace(/@import\\s+['"]bootstrap-icons[^;]+;?/g, '');
        if (content !== originalContent) {
          changed = true;
        }
      }

      // Fix App.tsx common issues
      if (f === 'App.tsx') {
        let originalContent = content;
        
        // Fix default to named imports
        content = content.replace(/import\\s+Navbar\\s+from\\s+["']([^"']+)["']/g, 'import { Navbar } from "$1"');

        // Fix alias paths
        content = content.replace(/@\\/components\\/Navbar/g, './components/Navbar');
        
        if (content !== originalContent) {
          changed = true;
        }
      }

      // Fix framer-motion type widening (TS2322): string literals for
      // ease/type/repeatType inside un-annotated variant/transition consts
      // widen to 'string' and fail the strict TS check even though the code
      // runs fine. Pin them with 'as const'. TSX sources only (never dist JS).
      if (p.endsWith('.tsx')) {
        let originalContent = content;
        content = content.replace(
          /\\b((?:ease|type|repeatType)\\s*:\\s*)(["'](?:easeIn|easeOut|easeInOut|linear|circIn|circOut|circInOut|backIn|backOut|backInOut|anticipate|spring|tween|inertia|keyframes|loop|reverse|mirror)["'])(?!\\s*as\\s+const)/g,
          '$1$2 as const'
        );
        // Enforce the em/en-dash ban mechanically: these characters only ever
        // appear in copy strings (they are invalid TS syntax outside strings),
        // and they are the #1 AI design tell. Replace with a plain hyphen.
        content = content.replace(/\u2014|\u2013/g, '-');
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
          svgDeclarations += \`const \${localName} = (props\${p.endsWith('.tsx') ? ': any' : ''}) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    \${svgPath}
  </svg>
);\\n\`;
        }
        newContent = newContent + svgDeclarations;
        content = newContent;
        changed = true;
      }
      if (changed) fs.writeFileSync(p, content);
    }
  }
}
fixPaths(process.argv[2]);
`;
          try {
            await sandbox.files.write("/app/fix-paths.js", fixPathsScript);
            await sandbox.commands.run("node /app/fix-paths.js src", { timeoutMs: 15000 });
          } catch (e) {
            console.error("DEBUG: fix-paths pre-pass failed (continuing)", e);
          }

          try {
            await sandbox.commands.run("npx eslint . --fix", { timeoutMs: 10000 });
          } catch {
            // ESLint might return non-zero exit code if some errors are unfixable; ignore and proceed
          }

          console.log(`DEBUG: Running strict TS check (Attempt ${attempt})...`);
          try {
            await sandbox.commands.run("npx tsc --noEmit");
          } catch (tsErr) {
            const err = tsErr as { stdout?: string, stderr?: string, message?: string };
            const tsErrorLog = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
            return { success: false, error: `TypeScript Error:\n${tsErrorLog || err.message}` };
          }

          console.log(`DEBUG: Running Vite build (Attempt ${attempt})...`);
          try {
            // vite build directly (not "npm run build") — the npm script re-runs
            // tsc -b, duplicating the strict gate above. Type checking happens
            // once (tsc --noEmit); bundling only verifies the site actually builds.
            await sandbox.commands.run("npx vite build --base=./");

            // Run post-build to fix bundled output files
            await sandbox.commands.run("node /app/fix-paths.js dist", { timeoutMs: 15000 });
          } catch (buildErr) {
            const err = buildErr as { stdout?: string, stderr?: string, message?: string };
            const viteErrorLog = ((err.stdout || "") + "\n" + (err.stderr || "")).trim();
            return { success: false, error: `Vite Build Error:\n${viteErrorLog || err.message}` };
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
        model: getModel("x-ai/grok-4.5"),
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
          if (await checkCancellation(event.data.projectId)) return;
          if (network.state.data.summary) return;
          return fixerAgent;
        },
        defaultModel: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
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
      if (await checkCancellation(event.data.projectId)) return { status: 'manually_stopped' };

      // Update our master state with whatever the fixer changed
      state.data.files = fixResult.state.data.files;
      finalFiles = state.data.files;

      // Fixer attempts repair the platform's own generation failures —
      // the user is never charged for them.
      attempt++;
    }

    // --- LENIENT BUILD FALLBACK ---
    // If the strict gate (tsc) could not be fully repaired, try bundling without
    // it. Type-only errors (e.g. framer-motion Variants widening) have zero
    // runtime impact — if Vite can bundle the site, ship it instead of failing
    // the whole run. Real breakage (missing imports, syntax errors) still fails
    // here because esbuild cannot bundle it.
    if (!isBuildSuccessful) {
      const lenientCheck = await step.run(`lenient-build-run-${runId}`, async () => {
        try {
          const sandbox = await getSandbox(sandboxId);
          await sandbox.commands.run("rm -rf dist").catch(() => { });
          await sandbox.commands.run("npx vite build --base=./");
          await sandbox.commands.run("node /app/fix-paths.js dist", { timeoutMs: 15000 }).catch(() => { });
          return { success: true };
        } catch (e) {
          console.error("DEBUG: Lenient build fallback also failed.", e);
          return { success: false };
        }
      });

      if (lenientCheck.success) {
        console.log("DEBUG: Lenient build passed — shipping despite remaining type-only errors.");
        isBuildSuccessful = true;
      }
    }

    const fragmentTitleGenerator = createAgent({
      name: `fragment-title-generator-run-${runId}`, // Ensure name is unique per run!
      description: "A fragment title generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
    });

    const responseGenerator = createAgent({
      name: `response-generator-run-${runId}`, // Ensure name is unique per run!
      description: "A response generator",
      system: RESPONSE_PROMPT,
      model: getModel(event.data.model || "google/gemini-3.1-flash-lite"),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(finalSummary);
    // Only generate a cheerful "here's what I built" message when the build
    // actually succeeded — otherwise the user gets an honest failure notice.
    const responseOutput = isBuildSuccessful
      ? (await responseGenerator.run(finalSummary)).output
      : undefined;

    console.log('DEBUG: Build successful:', isBuildSuccessful);

    const deploymentUrl = await step.run("deploy-to-r2", async () => {
      if (!isBuildSuccessful) {
        console.log("DEBUG: Build failed or fixing loops exhausted. Aborting deployment.");
        return null;
      }

      if (!isR2Configured()) {
        console.error("DEBUG: R2 is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_URL). Skipping deployment.");
        return null;
      }

      if (r2PublicUrlLooksLikeApiEndpoint()) {
        console.error(
          "DEBUG: R2_PUBLIC_URL points at the S3 API endpoint (*.r2.cloudflarestorage.com), which is NOT publicly browsable — it needs SigV4 auth and returns 'InvalidArgument / Authorization' in a browser. " +
          "Set R2_PUBLIC_URL to the bucket's PUBLIC url instead: enable the bucket's r2.dev Public Development URL (https://pub-xxxx.r2.dev) or bind a custom domain. Skipping deployment (the sandbox preview URL still works)."
        );
        return null;
      }

      console.log("DEBUG: Build succeeded. Extracting dist/ text assets for R2 deployment...");
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
        "      var key = p.split(path.sep).join('/').replace('dist/', '');",
        "      fileList[key] = fs.readFileSync(p).toString('base64');",
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
      const r2 = getR2Client();
      const sitePrefix = `sites/${event.data.projectId}/`;

      // Step 2: Upload text/code assets to R2 in batches (S3 PutObject)
      console.log(`DEBUG: Pushing ${Object.keys(files).length} assets to R2 bucket "${R2_BUCKET_NAME}"...`);
      const entries = Object.entries(files);
      const chunkSize = 25;

      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async ([relativePath, base64Content]) => {
          const buffer = Buffer.from(base64Content as string, 'base64');
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: `${sitePrefix}${relativePath}`,
            Body: buffer,
            ContentType: contentTypeFor(relativePath),
            CacheControl: "no-cache, max-age=0",
          }));
        }));
      }

      const finalUrl = `${r2PublicBase()}/${sitePrefix}index.html`;
      console.log(`DEBUG: R2 deployment complete: ${finalUrl}`);
      return finalUrl;
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
      const successContent = parseAgentOutput(responseOutput) || finalSummary;
      const failureContent =
        "I generated the site, but the automated build could not be fully repaired after several attempts, so it was not deployed. " +
        "The live preview may show errors. Please send a follow-up prompt describing what to adjust (or simply ask me to fix the errors) and I'll repair it.";

      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: isBuildSuccessful ? successContent : failureContent,
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
      const model = event.data.model || "google/gemini-3.1-flash-lite";
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
  {
    event: "veo/generate",
    cancelOn: [
      {
        event: "autonomous-agent/cancel",
        match: "data.projectId",
      }
    ]
  },
  async ({ event, step }) => {
    const { projectId, prompt, model, userId, refinePrompt, imagePrompt } = event.data;
    const cost = MODEL_COSTS[model as string] || 25;

    try {
      await step.run("update-project-stage-generating", async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "GENERATING_VIDEO" }
        });
      });

      // Opt-in only: refine when the agent invented the prompt ("Let AI Create" /
      // "Build it for me"). A prompt the user typed themselves is never rewritten.
      // Without this the raw website request reaches the video model with no camera
      // direction, and it fills the gap with cuts and cross-fades.
      const videoPrompt: string = !refinePrompt
        ? prompt
        : await step.run("refine-video-prompt", async () => {
          try {
            const { ChatOpenAI } = await import("@langchain/openai");
            const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");
            const { VIDEO_PROMPT_SYSTEM, VIDEO_PROMPT_SUFFIX, buildVideoRefinerInput } =
              await import("@/lib/media-prompts");

            const routerModel = new ChatOpenAI({
              modelName: "google/gemini-3.1-flash-lite",
              apiKey: process.env.OPENROUTER_API_KEY!,
              configuration: { baseURL: "https://openrouter.ai/api/v1" },
            });

            const response = await routerModel.invoke([
              new SystemMessage(VIDEO_PROMPT_SYSTEM),
              new HumanMessage(buildVideoRefinerInput(prompt, imagePrompt)),
            ]);

            const refined = (response.content as string).trim();
            if (!refined) return `${prompt}. ${VIDEO_PROMPT_SUFFIX}`;
            return `${refined} ${VIDEO_PROMPT_SUFFIX}`;
          } catch (err) {
            // Never fail the render over prompt polish — fall back to the raw
            // prompt plus the hard no-transition constraints.
            console.error("[Video] Prompt refinement failed, using fallback:", err);
            const { VIDEO_PROMPT_SUFFIX } = await import("@/lib/media-prompts");
            return `${prompt}. ${VIDEO_PROMPT_SUFFIX}`;
          }
        });

      const videoUri = await step.run("generate-video", async () => {
        let base64VideoData: string | null = null;
        let finalVideoUrl: string | null = null;

        if (model === "bytedance/seedance-1.5-pro") {
          const Replicate = (await import("replicate")).default;
          const replicate = new Replicate({
            auth: process.env.REPLICATE_API_KEY!,
          });

          const targetModel: `${string}/${string}` = "bytedance/seedance-1.5-pro";

          const input: Record<string, unknown> = { prompt: videoPrompt };

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
              prompt: videoPrompt,
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
