/**
 * Photography for the sections BELOW the background video.
 *
 * Generated with prunaai/p-image on Replicate rather than pulled from a stock
 * library: a stock API costs an attribution line on every customer's footer,
 * and stock photos of the wrong kitchen are what make a page read as a
 * template. Generated frames match the brief, cost about half a cent each, and
 * carry no licensing string.
 *
 * Never used over the video (the video is the image there) and never in the
 * footer. The whole point is the middle of the page.
 */

import { uploadMediaAsset } from "@/lib/media-storage";
import { withReplicateRateLimitRetry } from "@/lib/replicate-retry";
import { shouldMockMedia, MOCK_IMAGE_URL } from "@/lib/dev-media";

const MODEL: `${string}/${string}` = "prunaai/p-image";

/** Aspect ratios the model accepts that make sense in a page section. */
export type ImageAspect = "16:9" | "4:3" | "3:2" | "1:1" | "3:4" | "9:16";

export interface SectionImageRequest {
  /** Section id the image belongs to. */
  sectionId: string;
  /** Full text-to-image prompt. */
  prompt: string;
  aspect: ImageAspect;
}

export interface SectionImage {
  sectionId: string;
  /** R2 URL — ours, safe to embed in a shipped site. */
  url: string;
  /** Short alt text derived from the prompt. */
  alt: string;
  aspect: ImageAspect;
}

/** How many generations run at once. The model is fast; this keeps a build snappy
 *  without opening twenty predictions against one account at the same moment. */
const CONCURRENCY = 4;

export function isImageGenerationConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_KEY?.trim());
}

async function generateOne(
  request: SectionImageRequest,
  projectId: string,
  index: number,
): Promise<SectionImage | null> {
  try {
    const Replicate = (await import("replicate")).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY! });

    // predictions.create + poll rather than replicate.run: run() can hand back
    // FileRef objects that are not JSON-serialisable, which is fatal inside an
    // Inngest step.
    const prediction = await withReplicateRateLimitRetry(
      "predictions.create",
      () =>
        replicate.predictions.create({
          model: MODEL,
          input: {
            prompt: request.prompt,
            aspect_ratio: request.aspect,
            disable_safety_checker: false,
          },
        }),
    );

    let completed = prediction;
    const deadline = Date.now() + 90_000; // sub-second model; 90s is a hang, not slowness
    while (
      completed.status !== "succeeded" &&
      completed.status !== "failed" &&
      completed.status !== "canceled"
    ) {
      if (Date.now() > deadline) {
        console.warn(`[Section Images] Prediction ${prediction.id} timed out.`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 700));
      completed = await withReplicateRateLimitRetry("predictions.get", () =>
        replicate.predictions.get(prediction.id),
      );
    }

    if (completed.status !== "succeeded") {
      console.warn(`[Section Images] Prediction ${prediction.id} ${completed.status}.`);
      return null;
    }

    // The model's output is a single URI string, but tolerate an array in case
    // a future version returns one.
    const output = completed.output;
    const source = typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;
    if (typeof source !== "string" || !source) {
      console.warn("[Section Images] Prediction succeeded with no usable output.");
      return null;
    }

    const response = await fetch(source);
    if (!response.ok) {
      console.warn(`[Section Images] Download failed: ${response.status}`);
      return null;
    }

    const { url } = await uploadMediaAsset({
      buffer: Buffer.from(await response.arrayBuffer()),
      key: `site-images/${projectId}/${request.sectionId}-${index}.webp`,
      contentType: "image/webp",
    });

    return {
      sectionId: request.sectionId,
      url,
      alt: request.prompt.split(",")[0].trim().slice(0, 120),
      aspect: request.aspect,
    };
  } catch (error) {
    console.warn(`[Section Images] Generation failed for "${request.prompt.slice(0, 60)}":`, error);
    return null;
  }
}

/**
 * Generates every requested image in parallel batches and returns the ones that
 * made it. A failed image is dropped, never fatal — the page is designed to
 * survive having fewer than it asked for.
 */
export async function generateSectionImages(
  requests: SectionImageRequest[],
  projectId: string,
): Promise<SectionImage[]> {
  if (requests.length === 0) return [];

  // Local runs never pay Replicate. Every section still receives an image at
  // the shape it asked for, so the layout is identical to production — only the
  // billed call is skipped. A site with eight images would otherwise cost real
  // money on every one of a hundred test builds.
  if (shouldMockMedia()) {
    console.log(`[Section Images] Mock mode — serving the demo image for ${requests.length} slots.`);
    return requests.map((request) => ({
      sectionId: request.sectionId,
      url: MOCK_IMAGE_URL,
      alt: request.prompt.split(",")[0].trim().slice(0, 120),
      aspect: request.aspect,
    }));
  }

  if (!isImageGenerationConfigured()) return [];

  const done: SectionImage[] = [];

  for (let start = 0; start < requests.length; start += CONCURRENCY) {
    const batch = requests.slice(start, start + CONCURRENCY);
    const settled = await Promise.all(
      batch.map((request, offset) => generateOne(request, projectId, start + offset)),
    );
    for (const image of settled) if (image) done.push(image);
  }

  console.log(`[Section Images] Generated ${done.length}/${requests.length} images.`);
  return done;
}
