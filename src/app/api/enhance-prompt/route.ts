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
    const { prompt, type, projectId, activeVideoUrls, extractedZipUrl } = payload;

    if (!type || !["video", "code"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contents: any[] = [];

    if (type === "video") {
      const { startFrameUrl, endFrameUrl } = payload;
      
      let systemInstruction = `You are an expert prompt engineer for video generation. 
The user has provided a prompt. Enhance this prompt to be highly cinematic, detailed, and descriptive. Make it suitable for a high-end AI video generator. 
If the prompt is empty or just a few words, expand it into a full scene description.
Return ONLY the enhanced prompt. Do not include any conversational text, quotes, or explanations.`;

      if (startFrameUrl || endFrameUrl) {
        systemInstruction = `You are an expert prompt engineer for video generation. 
The user is generating a transitional video between provided images (a start frame, an end frame, or both). 
Based on the provided images and the user's prompt (if any), generate a highly cinematic, detailed, and descriptive prompt for a high-end AI video generator that logically transitions or animates from the start state to the end state.
Return ONLY the enhanced prompt. Do not include any conversational text, quotes, or explanations.`;
      }
      
      contents.push({ text: systemInstruction });
      contents.push({ text: `User prompt: ${prompt || "A cinematic scene"}` });

      if (startFrameUrl) {
        try {
          const res = await fetch(startFrameUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            contents.push({ text: "Start frame:" });
            contents.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: res.headers.get("content-type") || "image/jpeg"
              }
            });
          }
        } catch (e) {
          console.error("Failed to fetch startFrameUrl for enhancement", e);
        }
      }

      if (endFrameUrl) {
        try {
          const res = await fetch(endFrameUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            contents.push({ text: "End frame:" });
            contents.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: res.headers.get("content-type") || "image/jpeg"
              }
            });
          }
        } catch (e) {
          console.error("Failed to fetch endFrameUrl for enhancement", e);
        }
      }
    } else if (type === "code") {
      if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }

      const zipUrl = extractedZipUrl || activeVideoUrls?.[0]; // Fallback for debugging, but typically extractedZipUrl is in payload
      
      let base64Images: string[] = [];

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
