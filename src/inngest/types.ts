import type { TimeStr } from "inngest";

export const SANDBOX_TIMEOUT = 60_000 * 10 * 3; // 30 minutes in MS

/**
 * How long a run is allowed to take before Inngest cancels it.
 *
 * These are `timeouts.finish` values — a backstop against a run that has hung,
 * NOT a quality gate. They were all "15m", which was never measured against the
 * pipeline: a normal build (initial network at up to 16 iterations, plus the
 * corrective pass, plus up to five build/fix attempts) runs past 20 minutes, so
 * the deadline was cancelling healthy runs mid-build. A cancelled run is the
 * worst possible outcome — the user is charged, the sandbox is thrown away and
 * the site is half-written — so the budget has to sit above the slow path, not
 * on top of the average one.
 *
 * The sandbox is not the binding constraint: `getSandbox()` re-arms
 * SANDBOX_TIMEOUT on every call, so its 30 minutes slide forward with activity
 * for as long as the agent keeps touching it.
 *
 * A parent's budget has to cover its children's, because `step.invoke` runs
 * them inside the parent's window: autonomous invokes frames, video and code in
 * sequence, so its own ceiling is their sum plus the graph's own LLM calls.
 */
const budget = (envKey: string, fallback: TimeStr): TimeStr => {
  const raw = process.env[envKey]?.trim();
  // An unparseable override would be rejected by Inngest at sync time and take
  // every function in the app down with it. Ignore it and keep the default.
  if (raw && /^(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?$/.test(raw)) {
    return raw as TimeStr;
  }
  if (raw) {
    console.warn(`[Inngest] Ignoring invalid ${envKey}="${raw}" — expected a duration like "45m".`);
  }
  return fallback;
};

/** Env-overridable so a budget can be tuned without a deploy. */
export const RUN_TIMEOUT = {
  code: budget("TIMEOUT_CODE_AGENT", "45m"),
  autonomous: budget("TIMEOUT_AUTONOMOUS_AGENT", "90m"),
  video: budget("TIMEOUT_VIDEO_AGENT", "30m"),
  frames: budget("TIMEOUT_FRAMES_AGENT", "5m"),
} as const;
