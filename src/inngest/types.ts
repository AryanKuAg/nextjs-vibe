import type { TimeStr } from "inngest";

/**
 * How long a run is allowed to take before Inngest cancels it.
 *
 * These are `timeouts.finish` values — a backstop against a run that has hung,
 * NOT a quality gate. A cancelled run is the worst possible outcome, because
 * the user is charged for work that is then thrown away, so each budget sits
 * above its slow path rather than on top of its average one.
 *
 * Only the media pipeline is left here: site builds run on the v0 Platform API
 * and are not Inngest runs at all, so the code and autonomous budgets went with
 * the functions they governed.
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
  video: budget("TIMEOUT_VIDEO_AGENT", "30m"),
  frames: budget("TIMEOUT_FRAMES_AGENT", "5m"),
} as const;
