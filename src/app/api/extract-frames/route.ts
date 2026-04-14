import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import JSZip from "jszip";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import path from "path";
import fs from "fs";
import os from "os";

// Dynamically import ffmpeg to avoid issues with server startup
async function getFFmpeg() {
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const ext = process.platform === "win32" ? ".exe" : "";
  // Bypass Turbopack import mangling on file structures
  const ffmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg" + ext);
  ffmpeg.setFfmpegPath(ffmpegPath);
  
  return ffmpeg;
}

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

    // Use the explicitly passed videoUrl from the client, or fallback to first project video
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectVideos = (project as any)?.videoUrls as string[] || [];
    const videoUrl = bodyVideoUrl || projectVideos[0];

    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video provided or found for this project" },
        { status: 404 }
      );
    }

    // Download video from Vercel Blob into /tmp
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `vibe-frames-${projectId}-`));
    const videoPath = path.join(tmpDir, "video.mp4");
    const framesDir = path.join(tmpDir, "frames");
    fs.writeFileSync(videoPath, videoBuffer);
    fs.mkdirSync(framesDir);

    // Extract N evenly-spaced frames using ffmpeg
    const ffmpeg = await getFFmpeg();
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=30`,
          "-q:v 50",
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
    const bucketName = process.env.GCS_BUCKET_NAME || 'spatial_io';
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

    const zipUrl = `https://storage.googleapis.com/${bucketName}/${fileToUpload}`;

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
