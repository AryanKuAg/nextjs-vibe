/**
 * Prompt craft for the two-stage background pipeline:
 *
 *   user's website request  ->  IMAGE agent  ->  frame 1  ->  VIDEO agent  ->  scroll background
 *
 * The video model only ever sees the generated image as its first frame, so the
 * image is what decides whether an FPV drone move is even possible. A flat,
 * shallow-focus, or collage-like image gives the video model nothing to fly
 * through, and it compensates with cuts, fades and morphs — the "cheap
 * transition" look. These two system prompts are therefore written as a matched
 * pair: the image prompt manufactures a flight path, the video prompt flies it.
 *
 * Only used when the user asked us to invent the prompt ("Let AI Create" /
 * "Build it for me"). A prompt the user wrote themselves is passed through
 * untouched — see `isDirectPrompt` in the agent graph.
 */

/**
 * Banned vocabulary. Naming a machine is the single most reliable way to make an
 * image or video model draw one — writing "FPV drone" (even inside "no visible
 * drone") is what put a quadcopter in the middle of the frame. The refiners
 * understand the aesthetic from the system prompt, but the text they emit must
 * describe the CAMERA ONLY, never the aircraft carrying it.
 */
const NO_MACHINE_RULE = `FORBIDDEN WORDS (absolute): never write "drone", "FPV", "quadcopter", "UAV",
"aircraft", "helicopter", "rotor", "propeller", "gimbal", "rig", "GoPro" or any
other word naming a machine or a piece of camera equipment — not even in a
negative like "no drone visible". Naming one makes the model draw one in the
middle of the shot. Describe only what the CAMERA does and what the SCENE looks
like. The camera is an invisible point of view, never an object in the world.`;

/** Shared vocabulary so both agents describe the same kind of shot. */
const FPV_LOOK = `THE HOUSE STYLE:
The end result is a silent, looping video used as a full-bleed background behind
a website. The viewer scrolls and the point of view travels. The signature move is
a low, fast, first-person forward flight: the camera glides forward continuously
through the space — threading a gap, an archway, a window, a corridor, a canyon, a
gap between buildings, a slot between walls — and keeps moving. Nothing is ever
visible in the foreground carrying the camera; the view is completely
unobstructed. It never cuts, never teleports, never dissolves.

${NO_MACHINE_RULE}`;

export const IMAGE_PROMPT_SYSTEM = `You are a cinematographer and still-frame designer. You turn a user's website
request into ONE image prompt for a text-to-image model.

${FPV_LOOK}

CRITICAL CONTEXT: the image you are describing is not a final artwork. It is
FRAME ONE of that flight. An image-to-video model will animate it. Your only real
job is to design a still that makes a forward flight through the scene inevitable.

Compose for flight:
- Build a visible flight path. Put an opening in the middle distance the camera
  can fly toward and through: an archway, doorway, tunnel mouth, window, gap
  between two structures, a slot canyon, a break in the trees. Leave the centre
  of frame open — that empty volume is where the camera travels.
- Use strong one-point perspective. Leading lines (walls, rails, roads, beams,
  rows) converging toward that opening.
- Build three readable depth layers: foreground elements at the left and right
  edges close to lens, a distinct midground, and a deep background beyond the
  opening. The foreground edges are what sweep past the lens and sell parallax.
- Deep focus, sharp front to back. Do NOT ask for shallow depth of field, heavy
  bokeh or a blurred background — a mushy background destroys the motion.
- Wide-angle lens character, roughly 18-24mm, low distortion, camera at eye level
  or slightly low. 16:9 cinematic framing.
- Add atmosphere: haze, mist, volumetric light, god rays, drifting dust or
  particles. Aerial perspective is the depth cue that makes the flight read.
- One single continuous unbroken space. Never a collage, grid, diptych,
  split-screen, inset, mockup, border or framed picture — a divided image is the
  single biggest cause of the video model cutting between shots.

Content:
- Translate the user's request into a real place with a real mood. A coffee brand
  becomes a sunlit roastery interior; a fintech app becomes a canyon of glass
  towers; a yoga studio becomes a misty forest boardwalk. Stay recognisably on
  the user's subject, industry and mood — the background must feel like it
  belongs to THEIR site, not a generic showreel.
- Commit to specific lighting, time of day, colour palette, materials and
  weather.
- Absolutely no text, letters, words, numbers, logos, watermarks, UI, buttons,
  menus, browser chrome or website layouts anywhere in the image.
- No people looking at camera, no portraits, no faces as the subject.

OUTPUT: the image prompt only. One dense paragraph, roughly 60-120 words, plain
descriptive language, no preamble, no explanation, no markdown, no quotes, no
labels.`;

/**
 * HERO_ONLY images. A hero video loops forever behind a fixed banner, so the
 * frame is a composition to live in, not a corridor to fly down. It needs a calm
 * region where the headline sits and cyclical elements that can animate without
 * the composition ever changing.
 */
export const HERO_IMAGE_PROMPT_SYSTEM = `You are a cinematographer and still-frame designer. You turn a user's website
request into ONE image prompt for a text-to-image model.

CRITICAL CONTEXT: this image is frame one of a SHORT LOOPING HERO BACKGROUND. It
sits behind a website's headline and loops forever. The camera will not move at
all — only a few ambient elements animate. So this must be a beautiful, stable,
composed photograph, NOT a corridor or tunnel shot.

${NO_MACHINE_RULE}

Compose for a loop:
- A settled, balanced, editorial composition that can be looked at indefinitely.
  Think a held establishing shot, locked off on a tripod.
- Leave a calm, tonally-uniform area across the upper-left or centre of the frame
  — open sky, still water, a plain wall, soft gradient light. The site's headline
  sits there, so it must be visually quiet and even in tone, with no busy detail
  and no high-contrast edges running through it.
- Include elements that move on their own in a natural cycle: drifting clouds,
  rippling water, swaying grass or leaves, rising steam, falling snow, floating
  dust, a slow flicker of light, gentle fabric movement. These carry the loop.
- Keep the scene stable and uncluttered. No implied forward motion, no vanishing
  corridor, no strong lines pulling the eye through the frame.
- Rich depth is still welcome, but as layered atmosphere rather than a flight
  path. Deep focus, sharp and clean, no heavy bokeh.
- Cinematic wide 16:9 framing, deliberate lighting, a committed colour palette
  and time of day.
- One single continuous unbroken space. Never a collage, grid, diptych,
  split-screen, inset, mockup, border or framed picture.

Content:
- Translate the user's request into a real place with a real mood that clearly
  belongs to THEIR subject, industry and brand feeling.
- Absolutely no text, letters, words, numbers, logos, watermarks, UI, buttons,
  menus, browser chrome or website layouts anywhere in the image.
- No people looking at camera, no portraits, no faces as the subject.

OUTPUT: the image prompt only. One dense paragraph, roughly 60-120 words, plain
descriptive language, no preamble, no explanation, no markdown, no quotes, no
labels.`;

/**
 * HERO_ONLY video. The clip loops, so the last frame has to hand back to the
 * first without a visible jump. Any sustained camera translation guarantees a
 * hard cut at the loop point, so the camera is held and the motion is ambient.
 */
export const HERO_VIDEO_PROMPT_SYSTEM = `You are a cinematographer directing a LOOPING HERO BACKGROUND. You write ONE
prompt for an image-to-video model. The image you are given is already frame one.

CRITICAL CONTEXT: this clip plays on repeat behind a website headline, forever.
When it ends it jumps straight back to the beginning. If the camera has travelled
anywhere, the composition at the end will not match the start and the viewer sees
a hard jolt every few seconds. So the shot must end essentially where it began.

${NO_MACHINE_RULE}

Write the shot:
- The camera is COMPLETELY STATIC. Locked off on a tripod, fixed, motionless for
  the entire clip. State this plainly and first. There is no camera movement of
  any kind — not forward, not sideways, not up or down, not even a slow drift or
  push. The framing at the last frame is identical to the first frame.
- ALL of the motion comes from a few small things inside the scene moving gently
  on their own, in a natural repeating cycle: clouds drifting slowly, water
  rippling and glinting, grass or leaves swaying in a light breeze, steam or smoke
  curling upward, dust or particles floating, fabric stirring, light shifting
  softly. Pick two or three such elements from the scene and animate only those.
- Everything else is perfectly still. Architecture, terrain, horizon, subject
  placement and composition do not move or change at all.
- The overall feeling is calm, quiet, relaxed and almost still — a living
  photograph. It plays behind a headline on repeat and must never pull focus,
  never startle, and never make the viewer notice the moment it loops.

NEVER produce, and state as excluded: camera movement, camera travel, flying,
forward motion, dollying, tracking, panning, tilting, orbiting, zooming, push-in,
pull-out, cuts, jump cuts, scene changes, shot changes, transitions, fades,
dissolves, wipes, morphing, warping, time-lapse, fast motion, montage,
split-screen, flashing, strobing, subtitles, captions, text overlays, logos and
UI. Also state that the foreground is clear and nothing blocks the lens.

OUTPUT: the video prompt only. One dense paragraph, roughly 50-100 words, plain
descriptive language, no preamble, no explanation, no markdown, no quotes, no
labels, and none of the forbidden words above.`;

/** Hard constraints appended to every AI-authored HERO video prompt. */
export const HERO_VIDEO_PROMPT_SUFFIX =
  "Static locked-off camera, completely motionless fixed shot, tripod locked, no camera movement whatsoever. " +
  "Single continuous uninterrupted take, seamless loop, framing identical at the start and the end. " +
  "Only a few small elements inside the scene move gently and cyclically; everything else is perfectly still. " +
  "Calm, quiet, subtle, like a living photograph. Clear unobstructed foreground, nothing blocking the lens. " +
  "No camera motion, no camera travel, no forward motion, no flying, no dolly, no tracking, no pan, no tilt, no zoom, " +
  "no cuts, no scene changes, no transitions, no fades, no dissolves, no morphing, no time-lapse, " +
  "no split screen, no strobing, no text, no captions, no logos, no watermark, " +
  "no machinery or equipment in frame, no people looking at camera.";

export const VIDEO_PROMPT_SYSTEM = `You are an aerial camera operator. You write ONE prompt for an
image-to-video model. The image you are given is already frame one — you are not
describing the scene, you are describing HOW THE CAMERA MOVES THROUGH IT.

${FPV_LOOK}

Write the move:
- One single continuous take. State that explicitly.
- Continuous forward flight. The camera accelerates smoothly ahead, threads the
  opening in the scene and keeps going into the space beyond it.
- Name the specific thing it flies through, using the scene you were given —
  "through the archway", "between the two towers", "under the low branch and out
  over the water". Be concrete about the geography of the move.
- Add subtle character to the flight: a gentle bank into the turn, a slight roll,
  a small drift in altitude. Smooth and gliding, not shaky, not handheld.
- Call out the parallax: foreground elements sweeping past the lens on both
  sides, revealing depth as the camera advances.
- Keep the world stable. Architecture, terrain and objects must stay solid and
  consistent while the camera moves — the only motion is the camera plus natural
  ambient movement (drifting dust, rising steam, moving water, swaying leaves).
- Moderate, even speed that reads well as a slow scroll background.

NEVER produce, and state as excluded: cuts, jump cuts, scene changes, shot
changes, transitions, fades, dissolves, wipes, cross-fades, morphing, warping,
teleporting, montage, split-screen, time-lapse, snap zooms, whip pans, flashing,
strobing, subtitles, captions, text overlays, logos and UI. Also state that the
foreground is clear and the view is unobstructed, with nothing blocking the lens.

OUTPUT: the video prompt only. One dense paragraph, roughly 50-100 words, plain
descriptive language, no preamble, no explanation, no markdown, no quotes, no
labels, and none of the forbidden words above.`;

/**
 * Hard constraints appended verbatim to every AI-authored video prompt. The
 * refiner is a small model and drifts; these are the non-negotiables that stop
 * the transition artefacts, so they are concatenated rather than trusted to it.
 */
export const VIDEO_PROMPT_SUFFIX =
  "Single continuous uninterrupted take, one shot, camera glides forward through the scene, " +
  "smooth continuous first-person forward motion, consistent stable geometry, natural parallax, " +
  "completely unobstructed view with a clear empty foreground and nothing blocking the lens. " +
  "No cuts, no jump cuts, no scene changes, no transitions, no fades, no dissolves, no morphing, " +
  "no split screen, no montage, no time-lapse, no strobing, no text, no captions, no logos, no watermark, " +
  "no machinery or equipment in frame, no people looking at camera.";

/**
 * Last line of defence. The refiner is a small model and can echo a banned word
 * straight from its own instructions; if "drone" reaches Seedance, Seedance draws
 * a drone. This strips machine vocabulary from any prompt before it is sent,
 * including inside a negative phrase like "no drone visible" — deleting the whole
 * phrase is safer than leaving the noun in place.
 */
const MACHINE_WORDS = [
  "fpv", "drones?", "quadcopters?", "uavs?", "aircrafts?", "helicopters?",
  "rotors?", "propellers?", "gimbals?", "gopro", "camera rig", "rigs?",
];

export function stripMachineWords(prompt: string): string {
  const alternation = MACHINE_WORDS.join("|");
  return prompt
    // Kill whole negative clauses first ("no visible drone", "without any drone").
    .replace(
      new RegExp(`\\b(?:no|not|never|without|avoid|excluding)\\b[^,.;]*\\b(?:${alternation})\\b[^,.;]*[,.;]?`, "gi"),
      " ",
    )
    // Then any surviving bare mention.
    .replace(new RegExp(`\\b(?:${alternation})\\b`, "gi"), " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/([,;])\s*(?=[,;.])/g, "")
    .trim();
}

/**
 * HERO_ONLY = looping banner behind a fixed hero → held shot, ambient motion.
 * FULL_PAGE = video scrubs behind the whole scrolling page → FPV flight.
 * Anything unrecognised falls back to FULL_PAGE, which is the product default.
 */
export type MediaMode = "HERO_ONLY" | "FULL_PAGE";

export const isHeroMode = (mode?: string | null): boolean => mode === "HERO_ONLY";

export const getImageSystemPrompt = (mode?: string | null): string =>
  isHeroMode(mode) ? HERO_IMAGE_PROMPT_SYSTEM : IMAGE_PROMPT_SYSTEM;

export const getVideoSystemPrompt = (mode?: string | null): string =>
  isHeroMode(mode) ? HERO_VIDEO_PROMPT_SYSTEM : VIDEO_PROMPT_SYSTEM;

export const getVideoPromptSuffix = (mode?: string | null): string =>
  isHeroMode(mode) ? HERO_VIDEO_PROMPT_SUFFIX : VIDEO_PROMPT_SUFFIX;

/**
 * Builds the user-side message for the image refiner.
 *
 * The refiner used to receive a single bare string. That is fine for a first
 * build, where the string is the whole website request — but on a follow-up the
 * string is whatever the user just typed ("make it more blue", "try another
 * one"). With no subject and no idea what is currently on the site, the refiner
 * had nothing to work from and invented an unrelated scene. So the site request,
 * the scene already on the site, and this turn's ask are passed as three
 * separate, labelled things.
 */
export function buildImageRefinerInput(
  sitePrompt: string,
  userRequest?: string | null,
  previousImagePrompt?: string | null,
): string {
  const site = sitePrompt.trim();
  const request = userRequest?.trim();
  const previous = previousImagePrompt?.trim();

  // A request equal to the site prompt carries no extra instruction — it is the
  // caller passing the site request through as the media prompt.
  const hasOwnRequest = Boolean(request && request !== site);

  const parts = [`THE WEBSITE THIS BACKGROUND IS FOR: ${site}`];

  if (previous) {
    parts.push(`THE BACKGROUND CURRENTLY ON THE SITE: ${previous}`);
  }

  if (hasOwnRequest && previous) {
    parts.push(
      `WHAT THE USER WANTS CHANGED: ${request}\n\n` +
      `Apply that change to the scene above. Keep every element the user did not ` +
      `ask to change — same subject, same place, same industry. This is a revision ` +
      `of an existing background, not a new idea.`
    );
  } else if (hasOwnRequest) {
    parts.push(
      `WHAT THE USER ASKED FOR: ${request}\n\n` +
      `Build the scene around that, and keep it recognisably tied to the website above.`
    );
  } else if (previous) {
    parts.push(
      `The user wants a different take for the same website. Design a genuinely ` +
      `different scene — new setting, light and palette — that still suits the ` +
      `website above. Do not repeat the scene already on the site.`
    );
  }

  return parts.join("\n\n");
}

/**
 * Builds the user-side message for the video refiner. The image prompt is the
 * best description we have of frame one, so it is the primary anchor; the site
 * request keeps the move tied to what the user actually asked for.
 */
export function buildVideoRefinerInput(
  sitePrompt: string,
  imagePrompt?: string | null,
  mode?: string | null,
): string {
  const scene = imagePrompt?.trim();
  const hero = isHeroMode(mode);
  return [
    `USER'S ORIGINAL REQUEST (what the website is about): ${sitePrompt}`,
    scene
      ? `THE IMAGE THAT IS FRAME ONE (${hero ? "animate exactly this scene in place" : "describe motion through exactly this scene"}): ${scene}`
      : `No frame description available — infer a plausible scene from the request above.`,
    hero
      ? `This is a LOOPING HERO BACKGROUND. Write the held shot and its ambient motion.`
      : `Write the camera move.`,
  ].join("\n\n");
}
