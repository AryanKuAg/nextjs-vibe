/**
 * Retry wrapper for Replicate calls that hit the account rate limit.
 *
 * Replicate throttles low-balance accounts hard — "6 requests per minute with a
 * burst of 1 while you have less than $5.0 in credit" — and answers with a 429
 * plus a `retry_after` telling you exactly how long to wait, usually a few
 * seconds. Without this, one throttled request kills an entire generation run.
 *
 * Only 429s are retried. Everything else (bad input, model failure, auth) is a
 * real error and is rethrown immediately rather than retried blindly, which
 * matters because the callers that create predictions pay per attempt.
 */

const DEFAULT_BACKOFF_MS = [5_000, 10_000, 20_000];
const MAX_SINGLE_WAIT_MS = 60_000;

function isRateLimited(error: unknown): boolean {
  const status = (error as { response?: { status?: number }; status?: number })?.response?.status
    ?? (error as { status?: number })?.status;
  if (status === 429) return true;

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || /too many requests|throttled/i.test(message);
}

/**
 * Replicate reports the wait in the JSON body (`"retry_after": 7`), which the
 * SDK surfaces inside the error message. Seconds, converted to ms.
 */
function retryAfterMs(error: unknown, attempt: number): number {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/"retry_after"\s*:\s*(\d+(?:\.\d+)?)/);

  if (match) {
    // A second of headroom — the reported window is when the limit resets, and
    // coming back at exactly that instant tends to get throttled again.
    const ms = Math.ceil(Number(match[1]) * 1000) + 1_000;
    return Math.min(ms, MAX_SINGLE_WAIT_MS);
  }

  return DEFAULT_BACKOFF_MS[Math.min(attempt, DEFAULT_BACKOFF_MS.length - 1)];
}

export async function withReplicateRateLimitRetry<T>(
  label: string,
  fn: () => Promise<T>,
  { maxAttempts = 4 }: { maxAttempts?: number } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimited(error)) throw error;

      if (attempt === maxAttempts - 1) break;

      const waitMs = retryAfterMs(error, attempt);
      console.warn(
        `[Replicate] ${label} rate limited (attempt ${attempt + 1}/${maxAttempts}), retrying in ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Replicate rate limit not cleared for ${label} after ${maxAttempts} attempts. ` +
    `This usually means the Replicate account balance is below $5, which caps it at ` +
    `6 requests/minute with a burst of 1. Original error: ${detail}`
  );
}
