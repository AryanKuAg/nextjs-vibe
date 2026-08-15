import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A short-lived, signed pass for one chat's preview.
 *
 * The preview's own asset requests cannot authenticate with Clerk. They arrive
 * at the proxy through a middleware rewrite, and Clerk's request context does
 * not survive `NextResponse.rewrite()` — `auth()` throws outright on the far
 * side, which is what turned every stylesheet in a preview into a 500.
 *
 * So the document request, which is a normal navigation and does have Clerk
 * context, pays for the ownership check once and hands back a cookie. Every
 * asset the page then pulls presents that cookie instead. The grant is signed
 * (so it cannot be forged), HttpOnly (so the page's own scripts cannot read
 * it), scoped to a single chat id, and expires with the hour.
 */

const TTL_MS = 60 * 60 * 1000;

/** Cookie per chat, so two builder tabs do not evict each other's grant. */
export function previewGrantCookieName(chatId: string) {
  return `v0pg_${chatId.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function secret() {
  // No dedicated secret needed: any server-side value that is already secret
  // and stable works, and CLERK_SECRET_KEY is required for the app to run at
  // all. V0_PREVIEW_SECRET overrides it if you would rather rotate separately.
  const value = process.env.V0_PREVIEW_SECRET || process.env.CLERK_SECRET_KEY;
  if (!value) throw new Error("No secret available to sign preview grants");
  return value;
}

function sign(chatId: string, expiresAt: number) {
  return createHmac("sha256", secret()).update(`${chatId}.${expiresAt}`).digest("base64url");
}

export function issuePreviewGrant(chatId: string) {
  const expiresAt = Date.now() + TTL_MS;
  return `${expiresAt}.${sign(chatId, expiresAt)}`;
}

export function isValidPreviewGrant(value: string | undefined, chatId: string) {
  if (!value) return false;

  const [rawExpiry, signature] = value.split(".");
  const expiresAt = Number(rawExpiry);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = Buffer.from(sign(chatId, expiresAt));
  const actual = Buffer.from(signature);

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the length is not a secret.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export { TTL_MS as PREVIEW_GRANT_TTL_MS };
