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

/** A bare http(s) URL and nothing else — no prose around it. */
const BARE_URL = /^https?:\/\/\S+$/i;

/**
 * Repairs a brief whose video URL arrived in the prompt field.
 *
 * The composer shows one input for both "write a video prompt" and "paste a
 * video URL", backed by two pieces of state and switched by a chip. Type a URL
 * while the chip says prompt — or paste one, then change the chip — and the
 * URL is submitted as a description of footage to generate. Which is what
 * happened: a pixabay link was sent to the video model as a creative brief, and
 * the build came back with a generated clip instead of the video that was
 * pasted.
 *
 * Nobody has ever meant "make me a video that looks like https://…", so a bare
 * URL in that field is read as the URL it plainly is. Done here rather than
 * only in the composer so it holds however the request was made.
 */
export function normalizeBrief(brief: SiteBrief): SiteBrief {
  const written = brief.videoPrompt?.trim();
  if (brief.videoUrl || !written || !BARE_URL.test(written)) return brief;

  return { ...brief, videoPrompt: undefined, videoSource: "URL", videoUrl: written };
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
 * The rule both treatments share.
 *
 * Asking for content that stays "readable against" footage, or for "enough
 * contrast over it", is read as permission to drop a scrim — and a black 40%
 * sheet over the whole frame is the cheapest way to satisfy it. The result is a
 * dimmed, washed-out video with a hero pasted on top, which is the one thing a
 * video-led site must not look like: the footage is the reason the page exists
 * and the overlay is what stops it earning its place. Legibility has to come
 * out of the typography instead.
 */
const NO_OVERLAY =
  "Never put an overlay on the video: no dark tint, scrim, gradient wash, blur or semi-transparent panel between the footage and the content, at any opacity. The footage plays at full strength and the content sits directly on it. Get legibility from the type instead — its scale, weight and colour, and placing it where the frame is already calm.";

/**
 * Scroll-driven — what used to be called a full-page site.
 *
 * Three things here are requirements and everything else is the model's call.
 * The line between them has moved twice, so it is worth stating plainly.
 *
 * WHAT IS REQUIRED. The scrubbed video opens the page, content is laid over it,
 * and the page continues without it once the scroll passes. That is what the
 * product IS, not a layout preference — with it left unsaid the video turned up
 * as the third or fourth section with nothing on top of it, which is not a
 * scroll-driven site by any reading.
 *
 * WHAT IS MECHANISM. The package's own contract: `scrolly-video` sets
 * `position: sticky` on its container and reads its scroll range from
 * `container.parentNode`'s height, so a clipping or absolutely positioned
 * ancestor makes it render nothing at all. And because the container is sticky
 * and full-height, anything after it in flow starts a viewport lower — which is
 * why the overlay has to be pulled back up. Both were discovered by watching it
 * fail, not by reading design taste into it.
 *
 * WHAT IS NOT OURS. How many screens the passage lasts, what is layered over
 * the footage, and what the rest of the site becomes. An earlier version of
 * this prompt specified three full-height sections and "an ordinary website"
 * below them; every build came out as that same template, because we were
 * designing the site instead of the model.
 *
 * The scrubbing itself is handed to the package rather than described. Asking
 * for "buttery smooth" produced an eased chase that reassigned `currentTime`
 * sixty times a second, so every seek superseded the one still decoding and the
 * picture never moved; spelling the seeking out fixed nothing and wrecked the
 * layout instead.
 */
const SCROLL_DRIVEN = [
  "Use this video as a scroll-scrubbed background:",
  "%URL%",
  "",
  "Use the `scrolly-video` package for it: add it to package.json and import the React build (`scrolly-video/dist/ScrollyVideo.esm.jsx`) in a client component. Render it as `<ScrollyVideo src=\"…\" />` and pass nothing but the src — cover, sticky and full-viewport are already its defaults. It does the scrubbing itself, so write no scroll listener and never touch the video's currentTime.",
  "",
  "The video opens the site. Its container is the first thing on the page, it fills the viewport, and the site's own content sits directly on the footage — as many screens of it as the story wants. Scrolling moves the visitor through the video; when the scroll passes it the video is finished and the rest of the page carries on without it.",
  "",
  NO_OVERLAY,
  "",
  "Two mechanics make that work, and it renders nothing without them. Give the component a plain block element as its direct parent, taller than the viewport — that parent's height is the scroll range the video is mapped onto. Never position that parent absolutely, never put overflow: hidden on it or any ancestor, and never set width, height or position on the component or on the canvas it renders. Then put the sections that sit on the video inside that same parent, after the component, pulled back up by one viewport with a negative top margin and a higher z-index, so it rides on the footage from the first screen instead of starting below it.",
  "",
  "Everything else is yours: how many screens the scrubbed passage runs for, what is layered over it, and what the rest of the site becomes.",
].join("\n");

/**
 * Looping — what used to be called a hero site.
 *
 * One requirement: the first section is the looping footage with the page's
 * own opening content over it. What the rest of the page becomes is the
 * model's call.
 */
const LOOPING_HERO = [
  "Use this video in the hero:",
  "%URL%",
  "",
  "The first section of the site is this video: full-bleed behind it — autoplay, muted, looping, playsInline, object-cover — with the site's own opening content sitting directly on the footage. It just loops; it does not react to scroll.",
  "",
  NO_OVERLAY,
  "",
  "Everything after that first section is yours to design.",
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
