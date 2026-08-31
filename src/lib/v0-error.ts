import "server-only";

import { scrubVendor } from "@/lib/vendor-name";

/**
 * v0 SDK calls resolve to `{ data, error, response }` rather than throwing, so
 * a failure is easy to reduce to "something went wrong" on the way out. It was:
 * a daily message limit — a precise, actionable 403 from v0 — reached the user
 * as "v0 did not return a chat", which named neither the cause nor the fix.
 *
 * Everything that talks to v0 should raise one of these instead, so the status
 * survives far enough for the caller to tell an out-of-quota from an outage.
 */
export class V0RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "V0RequestError";
  }
}

type V0Result = { error?: unknown; response: Response };

/**
 * The upstream message is shown to the customer verbatim — see the tRPC
 * handlers, which forward `failure.message` as the error a toast renders. That
 * is the right call for actionable text ("this build has no files yet") and the
 * wrong one for the vendor's name, which tells the customer which API we resell.
 * Scrubbing here rather than at each call site means no future handler can
 * forward an unscrubbed one; "the build service" matches CAPACITY_MESSAGE.
 */
export function v0Failure(result: V0Result, fallback: string): V0RequestError {
  const error = result.error;
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : null;

  return new V0RequestError(scrubVendor(message ?? fallback), result.response.status);
}

/**
 * v0 is refusing work rather than failing at it — our account is out of quota
 * or being throttled. The distinction matters because the person who can fix it
 * is us, not the visitor staring at the error.
 */
export function isCapacityError(error: unknown): boolean {
  return error instanceof V0RequestError && (error.status === 403 || error.status === 429);
}

/** What to show a customer when the fault is ours to fix, not theirs. */
export const CAPACITY_MESSAGE =
  "The build service is at capacity right now. Please try again in a few minutes.";
