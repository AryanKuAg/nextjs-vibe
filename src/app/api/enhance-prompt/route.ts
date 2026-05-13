import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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
  } catch {}
  ffmpeg.setFfprobePath(ffprobePath);
  
  return ffmpeg;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY!,
});

export const maxDuration = 60; // 60s is enough for text generation and 5 frames extraction

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contents: any[] = [];

    if (type === "video") {
      const { startFrameUrl, endFrameUrl } = payload;
      
      const systemInstruction = `You are an expert prompt engineer for cinematic AI video generation. The user wants to generate a highly cinematic, dynamic, and continuous one-take video based on a starting frame. Analyze the visual style and any user instructions provided, and write a detailed, descriptive prompt for a high-end AI video generator. 

Study the following examples of high-quality prompts for inspiration on camera movement and cinematic style:
- The camera begins far from the snowy Christmas village, In a single smooth motion, the camera swoops, accelerating as it approach toward the town, as it reaches the street level, the camera begins weaving dynamically through the environment, turning sharply around building corners, gliding low over rooftops, dipping beneath hanging garlands and string lights, sliding between narrow alleys, and pauses in front of an character who is intensely focused on building a snowman on an empty village street. No music, no narration, no voices. Ambient SFX only: soft winter breeze, faint village ambience, subtle snow drift.
- Camera turns around and pans away from the girl making the snowman and goes left and turns passing through the village market activities and in continuous one-take momentum approaches intensely focused christmas carolers singing in a group. All intensity comes from camera movement only. No voice, no narration. No music.
- One continuous, unbroken shot. The camera begins on a tight, intimate shot of two people walking and talking outside in the snowy village square. Without cutting, the camera begins to lift upward, gathering speed as it transitions out of the close-up. The camera moves with dynamic, fluid momentum. The camera continues accelerating upward, curving around chimneys, rooftops, and glowing windows while always preserving the fixed village layout. The shot expands from close-up -> mid-level streetscape -> higher sweeping view, until the camera finally ascends into a majestic overhead shot of the entire snowy Christmas village glowing against the winter landscape. All intensity comes from camera movement only. No added characters or objects. Ambient SFX only: soft winter wind, faint distant village sounds, drifting snow. No music, no narration, no voices
- One continuous shot. Starting from a high vantage point above the glowing Christmas village, the camera turns and pushes forward passing the christmas tree on the right and glides out into the open North Pole landscape. It travels smoothly over snow-covered trees, frozen hills, and soft drifting snow, illuminated by vibrant northern lights. The motion and maintains it's speed. The camera weaves between frosted pines, skims over open white fields, and moves through pockets of glowing aurora light across the sky. No added objects or characters. Ambient SFX only: soft winter wind, distant snow drift. No music, no narration, no voices.
- Keep the same visual style, same lighting, and same environment as the reference image. Do not change any objects or layout. Camera turns around and flies through the workshop. Dive through openings, weave between conveyor lines, slice past machinery, and sprint across the factory floor. Sharp directional shifts, rapid angle changes, tight close passes, and wide sweeps. Continuous one-take momentum with relentless kinetic motion. All intensity comes from camera movement only.

If the user provided a prompt, enhance it using the cinematic movement patterns seen in the examples. If the user provided no prompt, write a brand new cinematic prompt based on the visual style of the provided image (start frame).
Return ONLY the final enhanced prompt. Do not include quotes, explanations, or conversational text.`;

      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_KEY,
      });

      const input: {
        prompt: string;
        system_prompt: string;
        max_tokens: number;
        image?: string;
      } = {
        prompt: prompt ? `User prompt: ${prompt}` : "Please describe a cinematic camera movement through this scene.",
        system_prompt: systemInstruction,
        max_tokens: 8192,
        ...( (startFrameUrl || endFrameUrl) ? { image: startFrameUrl || endFrameUrl } : {} )
      };

      const output = await replicate.run("anthropic/claude-4.5-sonnet", { input });
      
      // The output schema is an array of strings (iterator)
      const enhancedPrompt = Array.isArray(output) ? output.join("") : String(output);

      return NextResponse.json({ prompt: enhancedPrompt.trim() });
    } else if (type === "code") {
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
        
        // Get all files, sort them alphabetically (they should be numbered frame-0001.jpg etc)
        const allFiles = Object.values(zip.files)
          .filter(f => !f.dir && f.name.endsWith(".jpg"))
          .sort((a, b) => a.name.localeCompare(b.name));
          
        if (allFiles.length > 0) {
          // Select 5 evenly spaced frames (or however many we have if < 5)
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
        // Fallback to ffmpeg extraction if no zip URL is provided
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      const systemInstruction = `You are an expert web designer and developer. 
You are given ${base64Images.length} frames from the videos the user has generated. Based on these frames, decide on a cool, modern theme for a website that perfectly matches the aesthetics of the frames.
If the user provided a prompt, enhance it with the theme and suggest specific sections.
If no prompt was provided, create a comprehensive prompt describing a modern website with sample sections according to the theme of the frames.
CRITICAL DESIGN CONSTRAINT: The prompt must instruct the generator to build a highly minimal, transparent UI. Because the website will feature a beautiful AI-generated video background, NO opaque boxes, solid containers, or heavy backgrounds should block the view. All text, sections, and UI elements must float cleanly and elegantly over the background so the cinematic video remains completely visible at all times.
IMPORTANT: When defining website sections or headers, use plain human-readable titles (e.g. "OVERTURE", "MANIFESTATIONS"). Do NOT use non-human characters or programming-like syntax such as "//", "/*", "_", etc.
Return ONLY the enhanced prompt string. Do not include any other text, explanations, or markdown blocks.`;

      parts.push({ text: systemInstruction });
      parts.push({ text: `User prompt: ${prompt || ""}` });

      for (const base64 of base64Images) {
        parts.push({
          inlineData: {
            data: base64,
            mimeType: "image/jpeg"
          }
        });
      }
      
      contents = parts;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        temperature: 0.7,
      }
    });

    const enhancedPrompt = response.text?.trim() || prompt;
    
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }

    return NextResponse.json({ prompt: enhancedPrompt });
  } catch (err) {
    console.error("[enhance-prompt] Error:", err);
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
