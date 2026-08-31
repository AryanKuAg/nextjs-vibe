"use client";
/**
 * Appends the chat pass to a `/api/v0/*` URL.
 *
 * These handlers accept it in place of a Clerk session, which is what makes the
 * builder work on browsers where `auth()` resolves in tRPC but not in a route
 * handler. Ownership was already proven when `v0.workspace` minted it.
 */
export function withChatToken(url: string, token: string) {
  return `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`;
}
