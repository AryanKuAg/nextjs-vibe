import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 is S3-compatible, so we talk to it with the AWS S3 SDK.
 *
 * Two things are separate:
 *  - The S3 API credentials (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID)
 *    are used to UPLOAD objects to the bucket.
 *  - The PUBLIC URL that serves those objects (R2_PUBLIC_URL) is the bucket's
 *    r2.dev subdomain or a custom domain you bind to the bucket in the
 *    Cloudflare dashboard. The API endpoint is never publicly browsable.
 */

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "framerate-sites";

export const isR2Configured = (): boolean =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL
  );

export const getR2Client = (): S3Client =>
  new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

/** Public base URL that serves R2 objects, with any trailing slash removed. */
export const r2PublicBase = (): string => (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

/**
 * R2_PUBLIC_URL must be a PUBLIC url (the bucket's r2.dev subdomain or a bound
 * custom domain) — NOT the S3 API endpoint (*.r2.cloudflarestorage.com), which
 * requires SigV4 auth on every request and returns "InvalidArgument /
 * Authorization" for a plain browser GET. Guard against that common mistake.
 */
export const r2PublicUrlLooksLikeApiEndpoint = (): boolean =>
  /r2\.cloudflarestorage\.com/i.test(process.env.R2_PUBLIC_URL || "");

/** Map a file path to a sensible Content-Type for static hosting. */
export const contentTypeFor = (path: string): string => {
  const p = path.toLowerCase();
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
  if (p.endsWith(".css")) return "text/css";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".ico")) return "image/x-icon";
  if (p.endsWith(".mp4")) return "video/mp4";
  if (p.endsWith(".woff")) return "font/woff";
  if (p.endsWith(".woff2")) return "font/woff2";
  if (p.endsWith(".ttf")) return "font/ttf";
  if (p.endsWith(".otf")) return "font/otf";
  if (p.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (p.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
};
