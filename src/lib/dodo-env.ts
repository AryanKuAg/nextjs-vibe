/**
 * Which Dodo environment to talk to.
 *
 * NODE_ENV alone is not enough: every non-dev build (a Vercel preview
 * deployment, a local `next start`) reports "production" and would otherwise
 * transact against live_mode with real money. `DODO_ENVIRONMENT` lets those
 * environments opt into test_mode explicitly.
 */
export function dodoEnvironment(): "test_mode" | "live_mode" {
  const explicit = process.env.DODO_ENVIRONMENT?.toLowerCase();
  if (explicit === "test_mode" || explicit === "test") return "test_mode";
  if (explicit === "live_mode" || explicit === "live") return "live_mode";

  return process.env.NODE_ENV === "development" ? "test_mode" : "live_mode";
}
