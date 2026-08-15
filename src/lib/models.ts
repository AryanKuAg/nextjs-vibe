/**
 * Which model runs which job.
 *
 * Previously every agent except the code builder shared one id threaded through
 * `event.data.model`, which meant the cheapest model in the pipeline was making
 * the most consequential decisions — the Build Brief picks the palette, the
 * typography, the section plan and the composition, and it was running on
 * flash-lite while a frontier model downstream merely transcribed its output.
 *
 * Every task now runs on gemini-3.5-flash-lite, chosen for build latency: a full
 * build was taking ~20 minutes, dominated by output-token throughput rather than
 * by any stall.
 *
 * KNOWN RISK on `code` and `fixer` — read before debugging a stuck build. Both
 * run an agent loop over editFiles/readFiles/terminal, and a model that cannot
 * emit a clean tool call there does not degrade gracefully: it returns
 * `finish_reason: "error"` with `native_finish_reason: "MALFORMED_FUNCTION_CALL"`,
 * no content and zero billed tokens, which reads to the router as "still
 * working". This exact model did that previously and spun a build for twenty
 * minutes without writing a file, which is why those tasks had been moved to
 * claude-sonnet-5. Reasoning effort does not address tool-call formatting, so if
 * builds start finishing with no files written, this is the first thing to
 * suspect and MODEL_CODE / MODEL_FIXER are the way back out without a deploy.
 * createProgressGuard in ./inngest/utils is the loop-side backstop that stops
 * the spin, and functions.ts throws a named error when both attempts write
 * nothing.
 *
 * `vision` and `utility` do not drive tools — one reads a frame, the other
 * writes titles and chat replies — so they stay on no reasoning effort, since
 * neither touches the generated site and reasoning there is latency the user
 * waits on for nothing.
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
  // Design decisions live or die here — palette, typography, section plan. The
  // output is one small JSON and drives no tools, so this is the safest of the
  // three to run cheap; max effort buys the design thinking back.
  brief: { model: "google/gemini-3.5-flash-lite", reasoningEffort: "max" },

  // The long job: ~400k input tokens across its iterations, all of it driven by
  // tool calls. This is the entry most exposed to the MALFORMED_FUNCTION_CALL
  // risk described above — watch it first when a build ships nothing.
  code: { model: "google/gemini-3.5-flash-lite", reasoningEffort: "max" },

  // Runs the same tool set as the code agent, on the run's worst input: a broken
  // tree and a compiler error. Same tool-call exposure as `code`, and it fails
  // exactly when it is most needed.
  fixer: { model: "google/gemini-3.5-flash-lite", reasoningEffort: "max" },

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
