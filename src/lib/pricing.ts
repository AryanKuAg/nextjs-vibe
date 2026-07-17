/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

export const MODEL_COSTS: Record<string, number> = {
  "google/nano-banana-2-lite": 4,
  "bytedance/seedance-1.5-pro": 10,
  "deepseek/deepseek-v4-flash": 20
};

// Follow-up prompts (when a conversation already exists)
export const FOLLOW_UP_COSTS: Record<string, number> = {
  "deepseek/deepseek-v4-flash": 10
};
