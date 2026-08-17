/**
 * The brief a build is made from, and the message it turns into.
 *
 * There is deliberately no system prompt anywhere in this app. The old pipeline
 * shipped a multi-thousand-word system prompt because it was driving a bare
 * coding agent inside a sandbox that had to be told the stack, the file layout
 * and the build rules. v0 already knows all of that, so the entire instruction
 * set is a short user message: what to build, and what to do with the video.
 *
 * The composer collects three things and nothing decides anything on its own —
 * no router, no autonomous agent picking a path. Classic is a site. Cinematic
 * is a site with a video, and the two motions are the two shapes the old
 * pipeline called FULL_PAGE and HERO_ONLY:
 *
 *   Scroll-driven  ->  full-page site: the video scrubs behind the whole page
 *   Looping        ->  hero site: the video loops in the first section
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

/**
 * A build's brief, exactly as it is stored in `Project.prompts[0]`.
 *
 * One shape, written once when the project is created and read back by
 * everything downstream — the video agent, the v0 call, and a retry. Nothing
 * re-derives the user's choices from anywhere else.
 */
export type SiteBrief = {
  /** What the user actually asked for, in their own words. */
  startPrompt: string;
  mode: SiteMode;
  motion?: VideoMotion;
  videoSource?: VideoSource;
  /** The footage the user described, when they chose to write a prompt. */
  videoPrompt?: string;
  /** Public URL of a video v0 can fetch — pasted by the user or generated. */
  videoUrl?: string;
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

  const text = (key: string) =>
    typeof record[key] === "string" && (record[key] as string).trim()
      ? (record[key] as string)
      : undefined;

  return {
    startPrompt,
    // Older projects predate the mode switch and were all ordinary sites.
    mode: isSiteMode(record.mode) ? record.mode : "CLASSIC",
    motion: record.motion === "LOOP" || record.motion === "SCROLL" ? record.motion : undefined,
    videoSource:
      record.videoSource === "AUTO" ||
      record.videoSource === "PROMPT" ||
      record.videoSource === "URL"
        ? record.videoSource
        : undefined,
    videoPrompt: text("videoPrompt"),
    videoUrl: text("videoUrl"),
    referenceImageUrl: text("referenceImageUrl"),
  };
}

/**
 * Whether this brief needs footage made before the site can be built.
 *
 * A pasted URL is already a video. Auto and a written prompt are not — those
 * two run the video agent first, and v0 is not called until its URL exists.
 */
export function needsGeneratedVideo(brief: SiteBrief): boolean {
  if (brief.mode !== "CINEMATIC") return false;
  if (brief.videoUrl) return false;
  return brief.videoSource === "AUTO" || brief.videoSource === "PROMPT";
}

/**
 * What to send the video agent.
 *
 * A prompt the user typed is theirs and is used as written. Auto has no prompt
 * at all, so the site brief is handed over to be rewritten into one — that is
 * the only case where anything invents footage.
 */
export function videoRequestFor(brief: SiteBrief): { prompt: string; refinePrompt: boolean } {
  const written = brief.videoPrompt?.trim();

  return written && brief.videoSource === "PROMPT"
    ? { prompt: written, refinePrompt: false }
    : { prompt: brief.startPrompt, refinePrompt: true };
}

/**
 * Which house style the video is shot in.
 *
 * A scroll-driven background is travelled through, so it is a moving camera. A
 * hero background loops forever behind a headline, so the camera is locked off
 * and only the scene moves — otherwise the last frame does not match the first
 * and the loop point reads as a jump cut.
 */
export function videoLookFor(motion: VideoMotion | undefined): "HERO_ONLY" | "FULL_PAGE" {
  return motion === "LOOP" ? "HERO_ONLY" : "FULL_PAGE";
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

/**
 * Scroll-driven — what used to be called a full-page site.
 *
 * The scrubbing is handed to `scrolly-video` rather than described. Both
 * attempts at describing it failed, in opposite directions: asking only for
 * "buttery smooth" got an eased chase that reassigned `currentTime` sixty times
 * a second, so every seek superseded the one still decoding and the picture
 * never moved at all. Spelling out the seeking instead fixed nothing and cost
 * the layout — the three chapters ended up stacked in one pinned viewport,
 * headlines overlapping each other.
 *
 * The package solves the part that is genuinely hard (decoding frames ahead and
 * presenting the right one for a scroll position) and leaves the page to v0,
 * which was never the thing going wrong.
 *
 * Naming the package was not enough on its own, though. Left to guess at its
 * API, v0 passed `fullHeight fullWidth` — neither exists, and the three props
 * that do (cover, sticky, full) are all true by default anyway — and then wrapped
 * it in an absolutely positioned, overflow-hidden layer. That is fatal twice
 * over: the component sets `position: sticky` on its own container, which any
 * clipping ancestor disables, and it reads its scroll range from
 * `container.parentNode`'s height, which an inset-0 parent does not have. The
 * video rendered nothing at all. Hence the paragraph about layout: what it needs
 * is to be left alone inside a tall, ordinary block.
 */
const SCROLL_DRIVEN = [
  "Use this video as the page background:",
  "%URL%",
  "",
  "Use the `scrolly-video` package for it: add it to package.json and import the React build (`scrolly-video/dist/ScrollyVideo.esm.jsx`) in a client component. Render it as `<ScrollyVideo src=\"…\" />` and pass nothing but the src — it already defaults to cover, sticky and full-viewport. It does the scrubbing itself, so write no scroll listener and never touch the video's currentTime.",
  "",
  "It only draws if you let it own its own layout, so give it a plain block element as its direct parent, about three viewports tall. That parent's height is the scroll range the video is mapped onto. Do not position that parent absolutely, do not put overflow: hidden on it or on any ancestor — the component relies on position: sticky, which either of those kills — and do not set any width, height or position on the component or on what it renders, which is a canvas it creates rather than a video element you can target.",
  "",
  "The three story sections sit over the video inside that same tall parent, one per viewport, each with its own headline and copy, readable against the footage. Where that parent ends the video is finished, and the rest of the page is an ordinary website on a normal background — the sections the brief calls for, then a footer.",
].join("\n");

/** Looping — what used to be called a hero site. */
const LOOPING_HERO = [
  "Use this video in the hero:",
  "%URL%",
  "",
  "Play it full-bleed behind the first section only — autoplay, muted, looping, playsInline, object-cover — with a dark overlay so the headline and the nav stay readable. It just loops; it does not react to scroll.",
  "Everything below the hero is an ordinary website on a normal background: the sections the brief calls for, then a footer.",
].join("\n");

/** Compose the opening message for a build. */
export function buildSitePrompt(brief: SiteBrief): string {
  const parts = [brief.startPrompt.trim(), "", BUILD_IN_THE_APP];

  // Cinematic without a URL means the footage never arrived — a generation that
  // failed, or a retry from before there was one. An ordinary site is a far
  // better answer than instructions pointing at a video that does not exist.
  if (brief.mode === "CINEMATIC" && brief.videoUrl) {
    const treatment = brief.motion === "LOOP" ? LOOPING_HERO : SCROLL_DRIVEN;
    parts.push("", treatment.replace("%URL%", brief.videoUrl));
  }

  return parts.join("\n");
}
