/**
 * Every v0 call this app makes uses v0 Mini — the cheapest tier — and nothing
 * else. The model is not a user setting and not a client input: the route
 * handlers substitute this configuration for whatever the browser sent, so a
 * crafted request cannot bill us for v0 Max.
 *
 * Safe to import from client components; it holds no secrets.
 */
export const V0_MODEL_ID = "v0-mini" as const;

export const V0_MODEL_CONFIGURATION = {
  modelId: V0_MODEL_ID,
  /** Generated imagery is billed on top of the message; we supply our own. */
  imageGenerations: false,
} as const;
