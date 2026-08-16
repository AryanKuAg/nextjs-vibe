/**
 * The prompts that open a site build, and the choices the composer offers.
 *
 * There is deliberately no system prompt anywhere in this app. The old pipeline
 * shipped a multi-thousand-word system prompt because it was driving a bare
 * coding agent inside a sandbox that had to be told the stack, the file layout
 * and the build rules. v0 already knows all of that, so the entire instruction
 * set is a short user message: what to build, and how it should feel.
 */

/** An ordinary website, or a motion-led one built around video. */
export type SiteMode = "CLASSIC" | "CINEMATIC";

/** How the video behaves once it is on the page. */
export type VideoMotion = "SCROLL" | "LOOP";

/** Where the video comes from. */
export type VideoSource = "AUTO" | "PROMPT" | "URL";

export const SITE_MODES: { value: SiteMode; label: string; icon: string }[] = [
  { value: "CLASSIC", label: "Classic", icon: "ri-layout-2-line" },
  { value: "CINEMATIC", label: "Cinematic", icon: "ri-clapperboard-line" },
];

export const VIDEO_MOTIONS: {
  value: VideoMotion;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "SCROLL",
    label: "Scroll-driven",
    icon: "ri-cursor-line",
    description: "Video moves as you scroll down the page.",
  },
  {
    value: "LOOP",
    label: "Looping",
    icon: "ri-repeat-2-line",
    description: "Video plays in the hero section.",
  },
];

export const VIDEO_SOURCES: {
  value: VideoSource;
  /** Shown on the chip once chosen — shorter than the menu entry. */
  label: string;
  title: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "AUTO",
    label: "Auto video",
    title: "Auto generate",
    icon: "ri-magic-line",
    description: "AI creates the video for you",
  },
  {
    value: "PROMPT",
    label: "Custom prompt",
    title: "Write a video prompt",
    icon: "ri-keyboard-box-line",
    description: "Describe your video",
  },
  {
    value: "URL",
    label: "Video URL",
    title: "Paste a video URL",
    icon: "ri-link",
    description: "16:9 videos only",
  },
];

export function isSiteMode(value: unknown): value is SiteMode {
  return value === "CLASSIC" || value === "CINEMATIC";
}

export type SiteBrief = {
  mode: SiteMode;
  /** What the user actually asked for, in their own words. */
  prompt: string;
  /** Public URL of a video v0 can fetch. Never a data URL. */
  videoUrl?: string | null;
  /** The footage the user described, when there is no URL to point at. */
  videoDescription?: string | null;
  motion?: VideoMotion;
};

/** Compose the opening message for a build. */
export function buildSitePrompt(input: SiteBrief): string {
  const brief = input.prompt.trim();

  if (input.mode !== "CINEMATIC") {
    // Classic with footage still gets a hero treatment; without, the brief
    // needs no embellishment from us at all.
    if (!input.videoUrl) return brief;

    return [
      brief,
      "",
      "Use this video as the hero background:",
      input.videoUrl,
      "",
      "Render it full-bleed behind the hero only — autoplay, muted, loop, playsInline, object-cover, with a dark overlay so the headline and nav stay readable. Everything below the hero is an ordinary website: sections, content and a footer, no video.",
    ].join("\n");
  }

  const scrollDriven = (input.motion ?? "SCROLL") === "SCROLL";

  if (input.videoUrl) {
    return [
      brief,
      "",
      scrollDriven ? "Use this video as the background for the entire page:" : "Use this video in the hero:",
      input.videoUrl,
      "",
      scrollDriven
        ? "Pin it behind all the content and scrub it with scroll — scroll progress through the page maps to the video's timeline, so the footage plays as the visitor scrolls rather than on a timer. Keep it muted, playsInline and object-cover, and layer the page's sections on top of it with enough contrast to stay readable."
        : "Render it full-bleed behind the hero — autoplay, muted, loop, playsInline, object-cover, with a dark overlay so the headline and nav stay readable. Below the hero, build an ordinary page.",
    ].join("\n");
  }

  // Cinematic with no footage yet. The look is still a real instruction, and a
  // description of the intended footage tells v0 what the page is building
  // toward even before there is a file to place.
  return [
    brief,
    "",
    "Make it cinematic: full-bleed imagery, generous scale, and motion that responds to scroll. Lead with one arresting full-viewport moment before the page settles into its sections.",
    ...(input.videoDescription?.trim()
      ? ["", `The hero should feel like this footage: ${input.videoDescription.trim()}`]
      : []),
  ].join("\n");
}
