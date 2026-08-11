/**
 * Measures how bright the generated background frame actually is, so the text
 * colour over it is decided by arithmetic rather than by a model's impression.
 *
 * The pipeline used to ask a lightweight vision model "is this scene light or
 * dark?". That fails on frames that are both: a sunlit window in the middle with
 * dark timber down the sides reads as "bright", so the brief picks near-black
 * text, and the headline — which sits on the left, over the timber — becomes
 * unreadable. Contrast is a number; measure it.
 *
 * Everything here degrades gracefully: any failure returns null and the caller
 * falls back to the model-only path.
 */

/** WCAG relative luminance of one sRGB channel triplet, 0 (black) to 1 (white). */
function relativeLuminance(r: number, g: number, b: number): number {
  const linearize = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two relative luminances (1:1 to 21:1). */
function contrastRatio(a: number, b: number): number {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Luminance of the two text colours the build brief can choose between. */
const WHITE_TEXT_LUMINANCE = 1;
const NEAR_BLACK_TEXT_LUMINANCE = relativeLuminance(24, 24, 27); // tailwind zinc-900

/**
 * Large display text only needs 3:1 under WCAG. Below that a headline is
 * genuinely hard to read against the frame.
 */
const LARGE_TEXT_MIN_CONTRAST = 3;

export interface SceneLuminance {
  /** Mean relative luminance across the whole frame, 0-1. */
  overall: number;
  /** Mean luminance of each cell of a 3x3 grid, row-major (top-left first). */
  regions: number[];
  /** How many video frames fed the measurement. 1 means a single still. */
  framesSampled: number;
  /**
   * Dominant colour of each sampled frame, as hex. Measured from pixels, so the
   * accent can be chosen to sit with the footage instead of against it — a hot
   * pink band over a green meadow is the failure this exists to prevent.
   */
  dominantColors: string[];
  /** Human-readable label for the darkest and brightest cells. */
  darkestRegion: string;
  brightestRegion: string;
  /** Worst-case contrast each scheme achieves over any region of the frame. */
  whiteTextWorstContrast: number;
  darkTextWorstContrast: number;
  /** The scheme that survives the frame's worst region best. */
  recommendedScheme: "light-text" | "dark-text";
  /** True when the winning scheme actually clears the large-text threshold. */
  confident: boolean;
}

const REGION_NAMES = [
  "top-left", "top-centre", "top-right",
  "middle-left", "centre", "middle-right",
  "bottom-left", "bottom-centre", "bottom-right",
];

/**
 * Downsamples the frame and reports the contrast each text colour would achieve.
 * Returns null if the image cannot be fetched or decoded.
 */
export async function measureSceneLuminance(imageUrl: string): Promise<SceneLuminance | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`[Scene Luminance] Could not fetch frame: ${response.status}`);
      return null;
    }
    return await measureFrameLuminance(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.warn("[Scene Luminance] Fetch failed, falling back to model analysis.", e);
    return null;
  }
}

const GRID = 3;
const SIZE = 60;

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** The frame's dominant colour, or null if it cannot be read. */
async function frameDominant(input: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const { dominant } = await sharp(input).stats();
    return dominant ? toHex(dominant.r, dominant.g, dominant.b) : null;
  } catch {
    return null;
  }
}

/** Mean luminance of each cell of the 3x3 grid for one frame, or null. */
async function frameRegions(input: Buffer): Promise<number[] | null> {
  try {
    // sharp ships with Next; importing it lazily keeps it off any path that
    // doesn't need it and lets a missing binary fall back instead of crashing.
    const sharp = (await import("sharp")).default;
    const cell = SIZE / GRID;

    const { data } = await sharp(input)
      .resize(SIZE, SIZE, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sums = new Array(GRID * GRID).fill(0);
    const counts = new Array(GRID * GRID).fill(0);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 3;
        const region = Math.min(GRID - 1, Math.floor(y / cell)) * GRID
          + Math.min(GRID - 1, Math.floor(x / cell));
        sums[region] += relativeLuminance(data[i], data[i + 1], data[i + 2]);
        counts[region]++;
      }
    }

    return sums.map((sum, i) => sum / (counts[i] || 1));
  } catch (e) {
    console.warn("[Scene Luminance] Frame decode failed.", e);
    return null;
  }
}

/** Same measurement for callers that already hold the decoded frame bytes. */
export async function measureFrameLuminance(input: Buffer): Promise<SceneLuminance | null> {
  return measureFramesLuminance([input]);
}

/**
 * Measures a whole sequence of frames and reports the colour that survives ALL
 * of them.
 *
 * Per region we keep the brightest and darkest value any frame reaches, because
 * that is what each colour actually has to cope with: white text is worst on
 * the brightest patch the video ever shows in that spot, near-black text worst
 * on the darkest. A colour picked from one frame can fail two seconds later;
 * this cannot.
 */
export async function measureFramesLuminance(inputs: Buffer[]): Promise<SceneLuminance | null> {
  const perFrame: number[][] = [];
  const dominantColors: string[] = [];
  for (const input of inputs) {
    const regions = await frameRegions(input);
    if (regions) perFrame.push(regions);
    const dominant = await frameDominant(input);
    if (dominant && !dominantColors.includes(dominant)) dominantColors.push(dominant);
  }
  if (perFrame.length === 0) return null;

  const count = GRID * GRID;
  const brightest = new Array(count).fill(0);
  const darkest = new Array(count).fill(1);
  const means = new Array(count).fill(0);

  for (const regions of perFrame) {
    for (let i = 0; i < count; i++) {
      brightest[i] = Math.max(brightest[i], regions[i]);
      darkest[i] = Math.min(darkest[i], regions[i]);
      means[i] += regions[i] / perFrame.length;
    }
  }

  const overall = means.reduce((a, b) => a + b, 0) / count;

  const whiteTextWorstContrast = Math.min(
    ...brightest.map((l) => contrastRatio(WHITE_TEXT_LUMINANCE, l))
  );
  const darkTextWorstContrast = Math.min(
    ...darkest.map((l) => contrastRatio(NEAR_BLACK_TEXT_LUMINANCE, l))
  );

  const recommendedScheme =
    whiteTextWorstContrast >= darkTextWorstContrast ? "light-text" : "dark-text";
  const winningContrast = Math.max(whiteTextWorstContrast, darkTextWorstContrast);

  let darkestIndex = 0;
  let brightestIndex = 0;
  means.forEach((l, i) => {
    if (l < means[darkestIndex]) darkestIndex = i;
    if (l > means[brightestIndex]) brightestIndex = i;
  });

  return {
    overall,
    regions: means,
    framesSampled: perFrame.length,
    dominantColors,
    darkestRegion: REGION_NAMES[darkestIndex],
    brightestRegion: REGION_NAMES[brightestIndex],
    whiteTextWorstContrast,
    darkTextWorstContrast,
    recommendedScheme,
    confident: winningContrast >= LARGE_TEXT_MIN_CONTRAST,
  };
}

/**
 * The measurement callers should prefer: samples the real video across its
 * length, falling back to the still start frame if ffmpeg is unavailable.
 */
export async function measureBackgroundLuminance(
  videoUrl: string | null | undefined,
  startFrameUrl: string | null | undefined,
): Promise<SceneLuminance | null> {
  if (videoUrl) {
    const { extractVideoFrames } = await import("@/lib/video-frames");
    const frames = await extractVideoFrames(videoUrl, 5);
    if (frames.length > 0) {
      const measured = await measureFramesLuminance(frames);
      if (measured) return measured;
    }
  }

  if (startFrameUrl) return measureSceneLuminance(startFrameUrl);
  return null;
}

/** Renders the measurement for the scene-analysis and build-brief prompts. */
export function describeSceneLuminance(m: SceneLuminance): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const ratio = (n: number) => `${n.toFixed(1)}:1`;

  return [
    m.framesSampled > 1
      ? `MEASURED FROM ${m.framesSampled} FRAMES SAMPLED ACROSS THE ACTUAL VIDEO (pixel data, not an impression — this is ground truth, and it covers every point of the scroll, not just the opening shot):`
      : `MEASURED FROM THE ACTUAL FRAME (pixel data, not an impression — this is ground truth):`,
    `- Mean brightness: ${pct(m.overall)}`,
    m.dominantColors.length
      ? `- DOMINANT COLOURS OF THE FOOTAGE (sampled from pixels): ${m.dominantColors.join(", ")}.\n` +
      `  The accent MUST sit with these, not against them: either drawn from this family, or a considered ` +
      `complement of it. An unrelated saturated hue (hot pink over a green meadow, electric blue over warm timber) ` +
      `is a failure — it reads as a different website pasted underneath. This applies to the accent surface band ` +
      `most of all, because it fills the screen.`
      : `- Dominant colours could not be sampled — keep the accent restrained and neutral-leaning.`,
    `- Darkest area: ${m.darkestRegion} (${pct(Math.min(...m.regions))}); brightest: ${m.brightestRegion} (${pct(Math.max(...m.regions))})`,
    `- White text worst-case contrast over this frame: ${ratio(m.whiteTextWorstContrast)}`,
    `- Near-black text worst-case contrast over this frame: ${ratio(m.darkTextWorstContrast)}`,
    `- Therefore text_scheme MUST be "${m.recommendedScheme}".`,
    m.confident
      ? `- This clears the 3:1 minimum for large text over every part of the frame.`
      : `- WARNING: neither colour clears 3:1 everywhere, so this frame is hostile to text. ` +
      `Place hero copy over the ${m.recommendedScheme === "light-text" ? m.darkestRegion : m.brightestRegion} area ` +
      `(where the chosen colour has the most contrast), and use the heaviest display weight available.`,
  ].join("\n");
}
