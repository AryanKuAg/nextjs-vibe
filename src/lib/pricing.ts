/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

/**
 * Authoritative per-agent credit costs. These are what actually get charged.
 *
 * IMAGE is charged per agent RUN — each run is one paid generation, and a
 * regenerate is a new run the user asked for.
 *
 * CODE is charged per user MESSAGE, not per run: a single build can invoke the
 * code agent several times (template pass, lenient rebuild, retries) and the
 * user should pay once for the message that triggered it. It is therefore
 * charged by the caller that owns the message, never inside the agent.
 */
export const AGENT_COSTS = {
  IMAGE: 7,
  CODE: 4,
  /** One generated section photograph. Charged per image actually produced. */
  SECTION_IMAGE: 1,
} as const;

// Displayed in the model pickers. Kept in sync with AGENT_COSTS above.
export const MODEL_COSTS: Record<string, number> = {
  "google/nano-banana-2-lite": AGENT_COSTS.IMAGE,
  "google/gemini-3.5-flash-lite": AGENT_COSTS.CODE
};

// Follow-up prompts (when a conversation already exists)
export const FOLLOW_UP_COSTS: Record<string, number> = {
  "google/gemini-3.5-flash-lite": AGENT_COSTS.CODE
};
