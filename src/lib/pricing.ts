/**
 * Pricing constants shared between client and server.
 * Keep this file free of any server-only imports (prisma, auth, etc.)
 */

export const MODEL_COSTS: Record<string, number> = {
  "veo-3.1-lite-generate-001": 12,
  "veo-3.1-fast-generate-001": 32,
  "veo-3.1-generate-001": 80,
  "gemini-3.1-flash-image-preview": 7,
  "gemini-3-pro-image-preview": 14,
  "gemini-3.1-pro-preview": 100,
  "gemini-3.1-flash-lite-preview": 80,
};

// Follow-up prompts (when a conversation already exists) cost a flat 10 credits
export const FOLLOW_UP_COST = 10;
