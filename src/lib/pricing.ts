/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

export const MODEL_COSTS: Record<string, number> = {
  "replicate-nb-2": 7,
  "replicate-gpt-2": 3,
  "replicate-kling-v2.5-turbo-pro": 34,
  "replicate-prunaai/p-video": 40,
  "replicate-prunaai/p-video-draft": 15,
  "openrouter-seedance-2": 60,
  "openrouter-seedance-2-fast": 48,
  "openrouter-google/gemini-3.1-pro-preview": 65,
};

// Follow-up prompts (when a conversation already exists) cost a flat 10 credits
export const FOLLOW_UP_COST = 10;
