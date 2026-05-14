import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

// Helper to get ffmpeg path
async function getFFmpeg() {
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  let ffmpegBinaryPath: string;
  try {
    const systemPath = execSync("which ffmpeg").toString().trim();
    ffmpegBinaryPath = systemPath || path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  } catch {
    const ext = process.platform === "win32" ? ".exe" : "";
    ffmpegBinaryPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg" + ext);
  }
  ffmpeg.setFfmpegPath(ffmpegBinaryPath);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let ffprobePath: string = require("ffprobe-static").path;
  try {
    const systemPath = execSync("which ffprobe").toString().trim();
    if (systemPath) ffprobePath = systemPath;
  } catch { }
  ffmpeg.setFfprobePath(ffprobePath);

  return ffmpeg;
}

// Helper: call OpenRouter chat completions (OpenAI-compatible)
async function callOpenRouter(messages: object[], model = "openai/gpt-5.4"): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://framerate.space",
      "X-Title": "Framerate",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let tmpDir: string | null = null;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { prompt, type, projectId } = payload;

    if (!type || !["video", "code"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // ── VIDEO PROMPT ENHANCEMENT ───────────────────────────────────────────────
    if (type === "video") {
      const { startFrameUrl, endFrameUrl } = payload;

      const systemInstruction = `You are an expert cinematic AI video prompt engineer specialized in start-frame to end-frame continuous shot generation.

Your task is to generate highly realistic, seamless one-take cinematic video prompts for AI video models like Veo, Kling, Seedance, or Runway.

The user may provide:

* a start frame
* an end frame
* optional movement instructions

Your job is to describe ONLY physically realistic camera movement that can naturally connect both frames.

Rules:

* The shot must feel like one continuous real camera take
* Preserve the exact same environment, objects, lighting, geometry, and scene layout from the reference images
* NEVER introduce new objects, characters, effects, particles, lighting sources, or scene changes unless visible in the frames
* NEVER describe transformations, morphing, blending, dissolves, generation, material changes, or magical transitions
* NEVER allow objects to disappear, reappear, reshape, duplicate, or mutate
* Treat all movement like a real drone, crane, dolly, handheld gimbal, or tracking vehicle shot
* Emphasize stable geometry, realistic parallax, and physical camera motion
* If needed, explicitly state:

  * “same environment remains continuously visible”
  * “no morphing”
  * “no transforming objects”
  * “no generated transitions”
  * “no warping”
* Movement should be motivated only by:

  * pushing forward
  * pulling backward
  * orbital movement
  * crane up/down
  * spiraling descent
  * lateral tracking
  * 120/180 degree turns
  * low altitude glide
  * realistic camera tilt/pan

Prompt style:

* Extremely concise
* Cinematic
* Direct
* Maximum 80 words
* No flowery writing
* No storytelling
* Focus entirely on camera motion and scene continuity

Good prompt structure:

1. Camera movement
2. Subject/environment continuity
3. End frame reveal
4. Strict anti-morphing constraints
5. Ambient audio

Always end prompts with strict continuity constraints like:
“Same environment remains continuously visible throughout. Absolutely no morphing, no transforming objects, no generated transitions, no warping, no disappearing or reappearing elements.”

Then finish with:
“No humans. No narration. No voice. No music. Ambient SFX only.`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [];

      const userText = prompt
        ? `User prompt: ${prompt}\n\nAnalyze the provided frame(s) and generate a cinematic video prompt.`
        : "Analyze the provided frame(s) and generate a cinematic camera movement prompt for a seamless one-take video.";
      userContent.push({ type: "text", text: userText });

      const imageUrl = startFrameUrl || endFrameUrl;
      if (imageUrl) {
        userContent.push({ type: "image_url", image_url: { url: imageUrl } });
      }
      if (endFrameUrl && endFrameUrl !== startFrameUrl) {
        userContent.push({ type: "image_url", image_url: { url: endFrameUrl } });
      }

      const messages = [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent.length === 1 ? userContent[0].text : userContent },
      ];

      const enhancedPrompt = await callOpenRouter(messages);
      return NextResponse.json({ prompt: enhancedPrompt });
    }

    // ── CODE PROMPT ENHANCEMENT ────────────────────────────────────────────────
    if (type === "code") {
      if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }

      const base64Images: string[] = [];

      if (payload.extractedZipUrl) {
        const zipResponse = await fetch(payload.extractedZipUrl);
        if (!zipResponse.ok) {
          return NextResponse.json({ error: "Failed to download frames zip" }, { status: 400 });
        }

        const JSZip = (await import("jszip")).default;
        const zipBuffer = await zipResponse.arrayBuffer();
        const zip = await JSZip.loadAsync(zipBuffer);

        const allFiles = Object.values(zip.files)
          .filter(f => !f.dir && f.name.endsWith(".jpg"))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (allFiles.length > 0) {
          const numFramesToExtract = Math.min(5, allFiles.length);
          const selectedFiles = [];
          for (let i = 0; i < numFramesToExtract; i++) {
            const index = Math.floor(i * (allFiles.length - 1) / (numFramesToExtract - 1 || 1));
            selectedFiles.push(allFiles[index]);
          }

          for (const file of selectedFiles) {
            const buffer = await file.async("nodebuffer");
            base64Images.push(buffer.toString("base64"));
          }
        }
      } else {
        // Fallback: ffmpeg extraction from project videos
        const project = await prisma.project.findUnique({
          where: { id: projectId, userId },
        });

        if (!project) {
          return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        let videoUrlsToProcess: string[] = [];
        if (payload.activeVideoUrls && payload.activeVideoUrls.length > 0) {
          videoUrlsToProcess = payload.activeVideoUrls;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const projectVideos = (project as any)?.videoUrls as any[] || [];
          const sortedVideos = [...projectVideos].sort((a, b) => (a.blockIndex || 0) - (b.blockIndex || 0));
          videoUrlsToProcess = sortedVideos.map(v => typeof v === "string" ? v : v?.url).filter(Boolean);
        }

        if (videoUrlsToProcess.length === 0) {
          return NextResponse.json({ error: "No videos found in project" }, { status: 400 });
        }

        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `enhance-frames-`));
        const ffmpeg = await getFFmpeg();
        let frameCounter = 0;

        const framesPerVideo = Math.max(1, Math.floor(5 / videoUrlsToProcess.length));

        for (let i = 0; i < videoUrlsToProcess.length; i++) {
          if (frameCounter >= 5) break;

          const videoUrl = videoUrlsToProcess[i];
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) continue;

          const videoPath = path.join(tmpDir, `video-${i}.mp4`);
          fs.writeFileSync(videoPath, Buffer.from(await videoResponse.arrayBuffer()));

          const videoDuration = await new Promise<number>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
              if (err) resolve(16);
              else resolve(metadata.format.duration ?? 16);
            });
          });

          const framesToExtract = i === videoUrlsToProcess.length - 1 ? 5 - frameCounter : framesPerVideo;
          const exactFps = framesToExtract / videoDuration;

          await new Promise<void>((resolve, reject) => {
            ffmpeg(videoPath)
              .outputOptions([
                `-vf fps=${exactFps.toFixed(6)}`,
                "-q:v 5",
              ])
              .output(path.join(tmpDir as string, `video-${i}-frame-%04d.jpg`))
              .on("end", () => resolve())
              .on("error", (err: Error) => reject(err))
              .run();
          });

          frameCounter += framesToExtract;
        }

        const frameFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith(".jpg")).sort();
        for (const filename of frameFiles) {
          const buffer = fs.readFileSync(path.join(tmpDir as string, filename));
          base64Images.push(buffer.toString("base64"));
        }
      }

      const systemInstruction = `
You are an expert web designer and developer. You are given ${base64Images.length} frames from videos the user has generated. Analyze the frames and decide on a luxury, cinematic theme that perfectly matches their aesthetics — consider mood, color palette, time of day, culture, and atmosphere.

If the user provided a prompt, enhance it with the detected theme and define specific sections. If no prompt was provided, invent a compelling concept (a place, brand, experience, or philosophy) that feels native to the visuals.

Build a single-page HTML website prompt with the following rules: full-screen video/image background, all sections completely transparent — no cards, no boxes, no solid or semi-solid backgrounds — all text and UI float directly over the cinematic scene. Use elegant Google Fonts pairing suited to the theme. Define 5–6 sections that alternate strictly left-aligned and right-aligned (never centered except hero and footer), with at least 20vh of vertical breathing room between each. Each section contains only a heading, 1–3 lines of body text, and occasionally a ghost outline CTA button — nothing more. No borders, no shadows, no decorative containers. Scroll fade-in on each section via Intersection Observer. Mobile responsive. Output as a single HTML file.

Section names must be plain human-readable words (e.g. PHILOSOPHY, THE OFFERING, A PLACE APART). Do not use slashes, underscores, asterisks, or code-like syntax in section names. Return ONLY the final prompt string with no explanation, preamble, or markdown.`;

      // Build OpenRouter vision message with base64 frames
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [
        { type: "text", text: `User prompt: ${prompt || ""}` },
      ];

      for (const base64 of base64Images) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${base64}` },
        });
      }

      const messages = [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent },
      ];

      const enhancedPrompt = await callOpenRouter(messages);

      if (tmpDir) {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
      }

      return NextResponse.json({ prompt: enhancedPrompt });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[enhance-prompt] Error:", err);
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
