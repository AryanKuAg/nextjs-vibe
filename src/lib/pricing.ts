/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

export const MODEL_COSTS: Record<string, number> = {
  "google/nano-banana-2-lite": 4,
  "replicate-nb-2": 7,
  "bytedance/seedream-4.5": 4,
  "replicate-kling-v2.5-turbo-pro": 35,
  "replicate-prunaai/p-video": 8,
  "replicate-prunaai/p-video-draft": 2,
  "openrouter-seedance-2": 60,
  "openrouter-seedance-2-fast": 48,
  "kwaivgi/kling-v3-video": 34,
  "deepseek/deepseek-v4-pro": 30,
  "deepseek/deepseek-v4-flash": 10,
  "openai/gpt-oss-120b:free": 10,
  "gcp-veo-3.1-lite": 12,
  "bytedance/seedance-1.5-pro": 10
};

// Follow-up prompts (when a conversation already exists)
export const FOLLOW_UP_COSTS: Record<string, number> = {
  "deepseek/deepseek-v4-pro": 10,
  "deepseek/deepseek-v4-flash": 5,
  'openai/gpt-oss-120b:free': 5
};
