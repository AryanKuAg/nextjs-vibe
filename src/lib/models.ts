/**
 * Which model runs which job.
 *
 * Previously every agent except the code builder shared one id threaded through
 * `event.data.model`, which meant the cheapest model in the pipeline was making
 * the most consequential decisions — the Build Brief picks the palette, the
 * typography, the section plan and the composition, and it was running on
 * flash-lite while a frontier model downstream merely transcribed its output.
 *
 * The split now follows one rule: whether the task drives tools. `code` and
 * `fixer` run an agent loop over editFiles/readFiles/terminal, and a model that
 * cannot emit a clean tool call there does not degrade gracefully — it returns
 * `finish_reason: "error"` with `native_finish_reason: "MALFORMED_FUNCTION_CALL"`,
 * no content and zero billed tokens, which reads to the router as "still
 * working". gemini-3.5-flash-lite did exactly this and spun a build for twenty
 * minutes without writing a file, so both tool-driving tasks sit on a model
 * verified to hold a tool contract. See createProgressGuard in ./inngest/utils
 * for the loop-side backstop.
 *
 * `vision` and `utility` do not drive tools — one reads a frame, the other
 * writes titles and chat replies — so they stay on the cheap tier, and with no
 * reasoning effort, since neither touches the generated site and reasoning there
 * is latency the user waits on for nothing.
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

  // The long, expensive job: ~400k input tokens across its iterations, all of it
  // driven by tool calls. Reliability here is worth more than price per token —
  // a build that stalls costs a full run and ships nothing.
  code: { model: "anthropic/claude-sonnet-5", reasoningEffort: "high" },

  // Runs the same tool set as the code agent, on the run's worst input: a broken
  // tree and a compiler error. Pairing it with a weaker model than the one that
  // wrote the code means the fixer fails exactly when it is needed.
  fixer: { model: "anthropic/claude-sonnet-5", reasoningEffort: "high" },

  // No tools, no effect on the generated site — cheap and fast is correct.
  vision: { model: "google/gemini-3.5-flash-lite" },

  utility: { model: "google/gemini-3.5-flash-lite" },
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
