import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A short-lived, signed pass for one chat.
 *
 * Everything under `/api/v0/*` used to authenticate with Clerk directly, and in
 * practice that proved unreliable: `auth()` resolves in tRPC and in server
 * components while returning nothing in these route handlers, on browsers whose
 * cookie jar carries several Clerk instances at once. The preview cannot rely
 * on it at all — its asset requests arrive through a rewrite, where Clerk's
 * context does not survive.
 *
 * So ownership is proven once, in `v0.workspace`, where Clerk demonstrably
 * works and the project row is read anyway. That mints this pass, which the
 * browser presents on every follow-up request. It carries the user id so credit
 * charging still has someone to bill, is HMAC-signed (so neither the id nor the
 * expiry can be edited), is scoped to a single chat, and lapses within the hour.
 */

const TTL_MS = 60 * 60 * 1000;

/** Cookie per chat, so two builder tabs do not evict each other's pass. */
export function previewGrantCookieName(chatId: string) {
  return `v0pg_${chatId.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function secret() {
  // No dedicated secret needed: any server-side value that is already secret
  // and stable works, and CLERK_SECRET_KEY is required for the app to run at
  // all. V0_PREVIEW_SECRET overrides it if you would rather rotate separately.
  const value = process.env.V0_PREVIEW_SECRET || process.env.CLERK_SECRET_KEY;
  if (!value) throw new Error("No secret available to sign chat passes");
  return value;
}

function sign(chatId: string, userId: string, expiresAt: number) {
  return createHmac("sha256", secret())
    .update(`${chatId}.${userId}.${expiresAt}`)
    .digest("base64url");
}

export function issuePreviewGrant(chatId: string, userId: string) {
  const expiresAt = Date.now() + TTL_MS;
  return `${userId}.${expiresAt}.${sign(chatId, userId, expiresAt)}`;
}

/** Returns the user the pass was minted for, or null if it does not hold up. */
export function readPreviewGrant(value: string | undefined, chatId: string): string | null {
  if (!value) return null;

  const [userId, rawExpiry, signature] = value.split(".");
  const expiresAt = Number(rawExpiry);
  if (!userId || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const expected = Buffer.from(sign(chatId, userId, expiresAt));
  const actual = Buffer.from(signature);

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and the length is not a secret.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return userId;
}

export { TTL_MS as PREVIEW_GRANT_TTL_MS };
