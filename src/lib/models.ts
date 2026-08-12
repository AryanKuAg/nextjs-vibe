/**
 * Which model runs which job.
 *
 * Previously every agent except the code builder shared one id threaded through
 * `event.data.model`, which meant the cheapest model in the pipeline was making
 * the most consequential decisions — the Build Brief picks the palette, the
 * typography, the section plan and the composition, and it was running on
 * flash-lite while a frontier model downstream merely transcribed its output.
 *
 * A pricing check (OpenRouter, verified live) also showed the "cheap" default
 * was not cheap: gemini-3.1-flash-lite is $0.25/$1.50 per million against
 * gpt-5.6-luna-pro at $0.10/$0.60. The cheap tier here is both cheaper AND
 * stronger than what it replaces.
 *
 * Every entry is env-overridable so a model can be A/B'd without a deploy.
 */

export type ModelTask =
  | "brief"      // the creative director: palette, type, sections, composition
  | "code"       // builds the site
  | "fixer"      // repairs TypeScript errors
  | "vision"     // reads a video frame
  | "utility";   // routing, sanitising, titles, chat replies

interface ModelChoice {
  model: string;
  /** Only sent for models that accept it. */
  reasoningEffort?: string;
}

const DEFAULTS: Record<ModelTask, ModelChoice> = {
  // Design decisions live or die here, and the output is one small JSON, so a
  // strong model costs cents per build.
  brief: { model: "anthropic/claude-sonnet-5", reasoningEffort: "high" },

  // The long, expensive job: ~400k input tokens across its iterations.
  code: { model: "openai/gpt-5.6-luna-pro", reasoningEffort: "max" },

  // Needs code competence, not taste. Was on grok-4.5 at $2/$6 for no benefit.
  fixer: { model: "openai/gpt-5.6-luna-pro", reasoningEffort: "high" },

  vision: { model: "openai/gpt-5.6-luna-pro" },

  utility: { model: "openai/gpt-5.6-luna-pro" },
};

const ENV_KEYS: Record<ModelTask, [string, string]> = {
  brief: ["MODEL_BRIEF", "MODEL_BRIEF_EFFORT"],
  code: ["MODEL_CODE", "MODEL_CODE_EFFORT"],
  fixer: ["MODEL_FIXER", "MODEL_FIXER_EFFORT"],
  vision: ["MODEL_VISION", "MODEL_VISION_EFFORT"],
  utility: ["MODEL_UTILITY", "MODEL_UTILITY_EFFORT"],
};

export function modelFor(task: ModelTask): ModelChoice {
  const [modelKey, effortKey] = ENV_KEYS[task];
  const fallback = DEFAULTS[task];

  const effort = process.env[effortKey]?.trim() || fallback.reasoningEffort;

  return {
    model: process.env[modelKey]?.trim() || fallback.model,
    ...(effort ? { reasoningEffort: effort } : {}),
  };
}
