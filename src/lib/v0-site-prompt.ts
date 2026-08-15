/**
 * The prompts that open a site build.
 *
 * There is deliberately no system prompt anywhere in this app. The old pipeline
 * shipped a multi-thousand-word system prompt because it was driving a bare
 * coding agent inside a sandbox that had to be told the stack, the file layout
 * and the build rules. v0 already knows all of that, so the entire instruction
 * set is a short user message: what to build, and where the video goes.
 *
 * Only two shapes exist, and the user picks between them explicitly rather than
 * a classifier guessing:
 *   HERO      — video fills the hero section, ordinary page underneath.
 *   FULL_PAGE — video is the page's background, scrubbed by scroll.
 */

export type SiteMode = "HERO" | "FULL_PAGE";

export const SITE_MODES: { value: SiteMode; label: string; description: string }[] = [
  {
    value: "FULL_PAGE",
    label: "Scroll effect",
    description: "Video scrubs behind the whole page as you scroll",
  },
  {
    value: "HERO",
    label: "Hero video",
    description: "Cinematic hero, normal website below",
  },
];

export function isSiteMode(value: unknown): value is SiteMode {
  return value === "HERO" || value === "FULL_PAGE";
}

/**
 * Compose the opening message for a build. `videoUrl` is a public URL to the
 * video our media pipeline already generated — v0 fetches it directly, so it
 * must not be a data URL or a signed URL that expires mid-build.
 */
export function buildSitePrompt(input: {
  mode: SiteMode;
  /** What the user actually asked for, in their own words. */
  prompt: string;
  videoUrl?: string | null;
}): string {
  const brief = input.prompt.trim();

  // No video means neither treatment applies — send the brief through untouched
  // rather than describing a background that does not exist.
  if (!input.videoUrl) return brief;

  const videoDirection =
    input.mode === "HERO"
      ? [
          `Use this video as the hero background:`,
          input.videoUrl,
          ``,
          `Render it full-bleed behind the hero only — autoplay, muted, loop, playsInline, object-cover, with a dark overlay so the headline and nav stay readable. Everything below the hero is an ordinary website: sections, content and a footer, no video.`,
        ]
      : [
          `Use this video as the background for the entire page:`,
          input.videoUrl,
          ``,
          `Pin it behind all the content and scrub it with scroll — scroll progress through the page maps to the video's timeline, so the footage plays as the visitor scrolls rather than on a timer. Keep it muted, playsInline and object-cover, and layer the page's sections on top of it with enough contrast to stay readable.`,
        ];

  return [brief, "", ...videoDirection].join("\n");
}
