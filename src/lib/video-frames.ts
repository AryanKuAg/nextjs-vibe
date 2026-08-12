/**
 * Pulls still frames out of a generated background video.
 *
 * The text colour over the video used to be decided from the start-frame IMAGE
 * alone. That frame is where the video begins, not where it spends most of its
 * time: eight seconds of camera movement can carry a bright opening shot into a
 * dark interior, and copy chosen for the first frame becomes unreadable halfway
 * through the scroll. Sampling the real video across its whole length is the
 * only way to pick a colour that survives all of it.
 *
 * Every failure path returns an empty array. Callers fall back to the start
 * frame, which is what they measured before this existed.
 */

import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

/**
 * Resolves the ffmpeg binary the same way the extract-frames route does:
 * system-wide in the deployed container, the npm binary locally.
 */
async function getFFmpeg() {
  const ffmpeg = (await import("fluent-ffmpeg")).default;

  let binary: string;
  try {
    binary = execSync("which ffmpeg").toString().trim();
    if (!binary) throw new Error("not found");
  } catch {
    const ext = process.platform === "win32" ? ".exe" : "";
    binary = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg" + ext);
  }

  ffmpeg.setFfmpegPath(binary);
  return ffmpeg;
}

/**
 * Returns up to `count` frames sampled evenly across the video, as PNG buffers.
 * Empty array on any failure — this is an optimisation, never a build blocker.
 */
export async function extractVideoFrames(videoUrl: string, count = 5): Promise<Buffer[]> {
  let workDir: string | null = null;

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.warn(`[Video Frames] Could not fetch video: ${response.status}`);
      return [];
    }

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "frames-"));
    const videoPath = path.join(workDir, "source.mp4");
    fs.writeFileSync(videoPath, Buffer.from(await response.arrayBuffer()));

    const ffmpeg = await getFFmpeg();

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on("end", () => resolve())
        .on("error", reject)
        .screenshots({
          count,
          folder: workDir!,
          filename: "frame-%i.png",
          // 480 wide is far more than a 3x3 luminance average needs, and keeps
          // both the extraction and the decode close to instant.
          size: "480x?",
        });
    });

    const frames = fs
      .readdirSync(workDir)
      .filter((name) => name.startsWith("frame-") && name.endsWith(".png"))
      .sort()
      .map((name) => fs.readFileSync(path.join(workDir!, name)));

    console.log(`[Video Frames] Extracted ${frames.length} frames from the background video.`);
    return frames;
  } catch (error) {
    console.warn("[Video Frames] Extraction failed, falling back to the start frame.", error);
    return [];
  } finally {
    if (workDir) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        // A leftover temp dir is not worth failing a build over.
      }
    }
  }
}
