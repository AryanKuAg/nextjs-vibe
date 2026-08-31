/**
 * The brief a build is made from, and the message it turns into.
 *
 * There is deliberately no system prompt anywhere in this app. The old pipeline
 * shipped a multi-thousand-word system prompt because it was driving a bare
 * coding agent inside a sandbox that had to be told the stack, the file layout
 * and the build rules. v0 already knows all of that, so the entire instruction
 * set is a short user message: what to build.
 *
 * The composer collects the user's words and an optional reference image, and
 * nothing decides anything on its own — no router, no autonomous agent picking
 * a path. The "cinematic" treatment that used to live here, where a generated
 * clip was scrubbed or looped behind the page, went with the video agent.
 */

/**
 * A build's brief, exactly as it is stored in `Project.prompts[0]`.
 *
 * One shape, written once when the project is created and read back by
 * everything downstream — the v0 call, and a retry. Nothing re-derives the
 * user's choices from anywhere else.
 */
export type SiteBrief = {
  /** What the user actually asked for, in their own words. */
  startPrompt: string;
  /** A reference image the user attached, already uploaded to storage. */
  referenceImageUrl?: string;
};

/** Reads the brief back out of the `prompts` JSON column. */
export function siteBriefOf(prompts: unknown): SiteBrief | null {
  if (!Array.isArray(prompts)) return null;

  const first = prompts[0];
  if (!first || typeof first !== "object") return null;

  const record = first as Record<string, unknown>;
  const startPrompt = typeof record.startPrompt === "string" ? record.startPrompt : "";
  if (!startPrompt.trim()) return null;

  const referenceImageUrl =
    typeof record.referenceImageUrl === "string" && record.referenceImageUrl.trim()
      ? record.referenceImageUrl
      : undefined;

  return { startPrompt, ...(referenceImageUrl ? { referenceImageUrl } : {}) };
}

/**
 * The one structural constraint we impose.
 *
 * Left to itself v0 sometimes answers a brief by writing a loose `index.html`
 * and a script beside the Next.js app rather than inside it. The files are real
 * and the work is done, but the preview renders the app — still the untouched
 * starter — so the user is shown v0's "your generation will show here"
 * placeholder and concludes their site was never built.
 */
const BUILD_IN_THE_APP =
  "Build this inside the existing Next.js app: edit app/page.tsx and add any further routes under app/. Do not create a standalone index.html or a separate static server.";

/** Compose the opening message for a build. */
export function buildSitePrompt(brief: SiteBrief): string {
  return [brief.startPrompt.trim(), "", BUILD_IN_THE_APP].join("\n");
}

/**
 * The opening message of a remix.
 *
 * Importing a repo lands its files and nothing else — no turn runs, so the site
 * is never built and never previewed. This is the turn that starts it, and it
 * asks for as little as possible: a template is already the finished site, so
 * the only work is getting it running unchanged. Without the "do not redesign"
 * half, v0 reads an empty-looking request as an invitation to rewrite the page,
 * and the remix stops being a copy of the template.
 */
export const TEMPLATE_BUILD_PROMPT = [
  "Get this project running and produce a working preview of it.",
  "It is already finished, so keep the design, copy, layout and assets exactly as they are —",
  "do not redesign, restyle, rename or rewrite any part of it, and do not add pages or sections.",
  "The only goal is a live preview of the site as it already stands.",
].join(" ");
