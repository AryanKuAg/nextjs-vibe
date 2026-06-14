/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

export const MODEL_COSTS: Record<string, number> = {
  "replicate-nb-2": 7,
  "bytedance/seedream-4.5": 4,
  "replicate-kling-v2.5-turbo-pro": 35,
  "replicate-prunaai/p-video": 8,
  "replicate-prunaai/p-video-draft": 2,
  "openrouter-seedance-2": 60,
  "openrouter-seedance-2-fast": 48,
  "kwaivgi/kling-v3-video": 34,
  "openrouter-google/gemini-3.1-pro-preview": 80,
  "openrouter-google/gemini-3.5-flash": 60,
  "openrouter-google/gemini-3.1-flash-lite": 10,
  "openai/gpt-oss-120b:free": 10
};

// Follow-up prompts (when a conversation already exists)
export const FOLLOW_UP_COSTS: Record<string, number> = {
  "openrouter-google/gemini-3.1-pro-preview": 30,
  "openrouter-google/gemini-3.5-flash": 20,
  "openrouter-google/gemini-3.1-flash-lite": 5,
  'openai/gpt-oss-120b:free': 5
};
