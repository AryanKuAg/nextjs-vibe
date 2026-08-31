import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getR2Client, isR2Configured, r2PublicBase, R2_BUCKET_NAME, r2PublicUrlLooksLikeApiEndpoint } from "@/lib/r2";

/**
 * Generated media (scene images) is stored in Cloudflare R2,
 * the same bucket and client the built sites already deploy to.
 *
 * R2 is the only store, so an upload failure fails the generation — there is no
 * fallback copy to fall back to.
 */

export interface UploadedMedia {
  /** Public URL callers should store and serve. */
  url: string;
}

/**
 * Uploads one media object to R2.
 *
 * @param key Object key/path (e.g. "frames/<projectId>/frame-1.png").
 */
export async function uploadMediaAsset({
  buffer,
  key,
  contentType,
}: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<UploadedMedia> {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_URL."
    );
  }

  if (r2PublicUrlLooksLikeApiEndpoint()) {
    throw new Error(
      "R2_PUBLIC_URL points at the S3 API endpoint (*.r2.cloudflarestorage.com), which is not publicly browsable. " +
      "Set it to the bucket's public r2.dev URL or a bound custom domain."
    );
  }

  await getR2Client().send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Media filenames are timestamped and never rewritten, so they can be cached
    // hard — unlike site assets, which redeploy to the same key.
    CacheControl: "public, max-age=31536000, immutable",
  }));

  const url = `${r2PublicBase()}/${key}`;
  console.log(`[Media] Uploaded to R2: ${url}`);
  return { url };
}

/**
 * Maps a public asset URL back to its R2 object key.
 *
 * Returns null for anything that is not served from our R2 bucket — notably
 * legacy Google Cloud Storage URLs on projects created before the migration.
 * Callers fall back to a plain fetch for those, since they are public.
 */
export function r2KeyFromUrl(url: string): string | null {
  const base = r2PublicBase();
  if (base && url.startsWith(`${base}/`)) return url.slice(base.length + 1);
  return null;
}

/** Downloads one object from R2. Throws if the key does not exist. */
export async function downloadMediaAsset(key: string): Promise<Buffer> {
  const res = await getR2Client().send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

/**
 * Fetches an asset by public URL, reading through R2 when the URL belongs to our
 * bucket and falling back to a plain HTTP GET otherwise (legacy GCS URLs).
 */
export async function fetchAssetByUrl(url: string): Promise<Buffer> {
  const key = r2KeyFromUrl(url);
  if (key) return downloadMediaAsset(key);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch asset (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Deletes objects by key. Missing keys are ignored. Best-effort, never throws. */
export async function deleteMediaAssets(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;

  const client = getR2Client();
  // DeleteObjects accepts at most 1000 keys per call.
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000);
    try {
      await client.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }));
    } catch (err) {
      console.error("[Media] R2 delete batch failed (continuing):", err);
    }
  }
}

/** Deletes every object under a key prefix. Best-effort, never throws. */
export async function deleteMediaPrefix(prefix: string): Promise<void> {
  if (!prefix) return;
  const client = getR2Client();
  let continuationToken: string | undefined;

  try {
    do {
      const listed = await client.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));

      const keys = (listed.Contents ?? []).map((o) => o.Key).filter((k): k is string => Boolean(k));
      await deleteMediaAssets(keys);

      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch (err) {
    console.error(`[Media] R2 prefix cleanup failed for "${prefix}" (continuing):`, err);
  }
}
