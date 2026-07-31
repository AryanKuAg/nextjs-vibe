import { uploadMediaAsset } from "@/lib/media-storage";

/**
 * Moves a browser-supplied `data:` image into R2 and returns its public URL.
 *
 * Data URLs must never be forwarded to Inngest: the payload limit is ~1MB and a
 * user's screenshot blows past it, so the event is rejected and the whole run
 * dies. Everything downstream — the agents, the vision models — takes a URL.
 *
 * Returns null when there is nothing to upload or the upload fails; callers
 * treat a reference image as optional and continue without it.
 */
export async function uploadDataUrlToStorage(
  dataUrl: string | undefined | null,
  keyPrefix: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;

  try {
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = dataUrl.slice(match[0].length);
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) return null;

    const ext = (mimeType.split("/")[1] || "jpg").replace("+xml", "");
    const { url } = await uploadMediaAsset({
      buffer,
      key: `${keyPrefix}/upload-${Date.now()}.${ext}`,
      contentType: mimeType,
    });
    return url;
  } catch (e) {
    console.error("[uploadDataUrl] Failed to store uploaded image:", e);
    return null;
  }
}
