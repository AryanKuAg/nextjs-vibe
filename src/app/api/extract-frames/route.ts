import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import JSZip from "jszip";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

// Dynamically import ffmpeg to avoid issues with server startup
async function getFFmpeg() {
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  // In Cloud Run (Alpine), ffmpeg is installed system-wide via `apk add ffmpeg`.
  // Locally on macOS, fall back to the ffmpeg-static npm binary.
  let ffmpegBinaryPath: string;
  try {
    const systemPath = execSync("which ffmpeg").toString().trim();
    ffmpegBinaryPath = systemPath || path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  } catch {
    // which failed — use the npm binary
    const ext = process.platform === "win32" ? ".exe" : "";
    ffmpegBinaryPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg" + ext);
  }
  console.log(`[extract-frames] Using ffmpeg at: ${ffmpegBinaryPath}`);
  ffmpeg.setFfmpegPath(ffmpegBinaryPath);
  return ffmpeg;
}

export const maxDuration = 300; // Allow 5 minutes for video processing on Vercel

export async function POST(req: NextRequest) {
  let tmpDir: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { projectId: string; videoUrl?: string; frameCount?: number };
    const { projectId, videoUrl: bodyVideoUrl } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });

    // Use all videos sorted by blockIndex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectVideos = (project as any)?.videoUrls as any[] || [];
    const sortedVideos = [...projectVideos].sort((a, b) => (a.blockIndex || 0) - (b.blockIndex || 0));
    const videoUrlsToProcess = bodyVideoUrl ? [bodyVideoUrl] : sortedVideos.map(v => typeof v === "string" ? v : v?.url).filter(Boolean);

    if (videoUrlsToProcess.length === 0) {
      return NextResponse.json(
        { error: "No video provided or found for this project" },
        { status: 404 }
      );
    }

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `vibe-frames-${projectId}-`));
    const framesDir = path.join(tmpDir, "frames");
    fs.mkdirSync(framesDir);

    const videoPaths = [];
    for (let i = 0; i < videoUrlsToProcess.length; i++) {
      const videoResponse = await fetch(videoUrlsToProcess[i]);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video ${i}: ${videoResponse.statusText}`);
      }
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const p = path.join(tmpDir, `video-${i}.mp4`);
      fs.writeFileSync(p, videoBuffer);
      videoPaths.push(p);
    }

    const ffmpeg = await getFFmpeg();
    
    // Combine videos if there are multiple
    let videoPath = videoPaths[0];
    if (videoPaths.length > 1) {
      const listPath = path.join(tmpDir, "list.txt");
      const listContent = videoPaths.map(p => `file '${p}'`).join("\n");
      fs.writeFileSync(listPath, listContent);
      
      const combinedVideoPath = path.join(tmpDir, "combined.mp4");
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listPath)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions(["-c", "copy"])
          .output(combinedVideoPath)
          .on("end", () => resolve())
          .on("error", (err: Error) => reject(err))
          .run();
      });
      videoPath = combinedVideoPath;
    }

    // First, probe the video duration using ffprobe
    // In Cloud Run (Alpine), ffprobe is installed system-wide via `apk add ffmpeg`.
    // Locally on macOS, we fall back to the ffprobe-static npm binary.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let ffprobePath: string = require("ffprobe-static").path;
    try {
      // Prefer system ffprobe if available (Cloud Run Alpine)
      const systemPath = execSync("which ffprobe").toString().trim();
      if (systemPath) ffprobePath = systemPath;
    } catch {
      // Not found in PATH — stick with ffprobe-static (local dev)
    }
    console.log(`[extract-frames] Using ffprobe at: ${ffprobePath}`);
    ffmpeg.setFfprobePath(ffprobePath);

    const videoDuration = await new Promise<number>((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.warn("[extract-frames] ffprobe failed, defaulting to 16s:", err.message);
          return resolve(16); // safe fallback
        }
        resolve(metadata.format.duration ?? 16);
      });
    });

    // Compute the exact fps to always produce exactly 450 frames from any video length
    const TARGET_FRAMES = 450;
    const exactFps = TARGET_FRAMES / videoDuration;
    console.log(`[extract-frames] Video duration: ${videoDuration}s. Target FPS: ${exactFps.toFixed(4)} to produce ${TARGET_FRAMES} frames.`);

    // Extract exactly 450 evenly-spaced frames using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${exactFps.toFixed(6)}`,
          "-q:v 5", // 2-31 scale (lower is better). 5 provides very high quality without massive file sizes.
        ])
        .output(path.join(framesDir, "frame-%04d.jpg"))
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const frameFiles = fs
      .readdirSync(framesDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    if (frameFiles.length === 0) {
      throw new Error("ffmpeg produced no frames");
    }

    // Compress all frames into a single ZIP buffer natively
    const zip = new JSZip();
    for (const filename of frameFiles) {
      const frameBuffer = fs.readFileSync(path.join(framesDir, filename));
      zip.file(filename, frameBuffer);
    }
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });

    // Upload a singular ZIP to GCS
    const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
    const storage = new Storage({ 
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }
    });

    const bucket = storage.bucket(bucketName);
    const fileToUpload = `frames/${projectId}/frames.zip`;
    const gcsFile = bucket.file(fileToUpload);
    await gcsFile.save(zipBuffer, { metadata: { contentType: "application/zip" } });

    const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
    const zipUrl = `${cdnBase}/${fileToUpload}`;

    // Clean up tmp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;

    console.log(`[extract-frames] Zipped ${frameFiles.length} frames for project ${projectId} -> ${zipUrl}`);
    return NextResponse.json({ zipUrl });
  } catch (err) {
    console.error("[extract-frames] Error:", err);
    // Cleanup on error
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
