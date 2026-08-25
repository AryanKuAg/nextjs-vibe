/**
 * Prompt craft for the background image agent:
 *
 *   user's website request  ->  IMAGE agent  ->  background plate
 *
 * NOTE ON THE WORDING BELOW. These prompts were written when the image was
 * frame one of a generated clip, so they still direct the composition as if a
 * camera were about to fly through it — an open centre, three depth layers,
 * deep focus. The video agent is gone, but the wording is left exactly as it
 * was: it is tuned copy that decides what the image model draws, and rewriting
 * it would change every background this app produces. Reword it as a deliberate
 * change to the look, not as part of a cleanup.
 *
 * Only used when the user asked us to invent the prompt. A prompt the user wrote
 * themselves is passed through untouched — see `isDirectPrompt` in the agent.
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

Legibility (this frame is a BACKGROUND — a headline will sit on top of it):
- The site's text goes over this image with no tint, scrim or shadow to help it,
  so the frame must be tonally coherent: either predominantly dark OR
  predominantly light, never both at once.
- The most common failure is a crushed-black foreground at the edges against a
  blown-out opening in the centre. That frame has no text colour that works —
  white disappears into the bright middle, near-black disappears into the dark
  edges. Keep the foreground edges and the opening within a few stops of each
  other: silhouetted edges must stay readable rather than going pure black, and a
  bright opening must stay detailed rather than clipping to white.
- Keep one calm, low-detail area toward the lower-left or lower-third of the
  frame — even tonality, no busy texture or high-frequency detail. That is where
  the headline will sit.
- Atmosphere and haze help here: they compress the tonal range and make text
  land. Extreme backlighting and hard specular hotspots hurt it.

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
- Keep the whole frame tonally coherent: either predominantly dark OR
  predominantly light, never both. The headline sits on top with no tint, scrim or
  shadow to help it, so a frame that pairs a crushed-black foreground with a
  blown-out highlight leaves no text colour that works anywhere. Silhouettes stay
  readable rather than going pure black; bright areas stay detailed rather than
  clipping to white.
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
 * Last line of defence. The refiner is a small model and can echo a banned word
 * straight from its own instructions; if "drone" reaches the image model, it
 * draws a drone. This strips machine vocabulary from any prompt before it is sent,
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
 * HERO_ONLY = a still plate behind a fixed hero → calm, composed in place.
 * FULL_PAGE = a plate for the whole scrolling page → depth, an opening, a way in.
 * Anything unrecognised falls back to FULL_PAGE, which is the product default.
 */
export type MediaMode = "HERO_ONLY" | "FULL_PAGE";

export const isHeroMode = (mode?: string | null): boolean => mode === "HERO_ONLY";

export const getImageSystemPrompt = (mode?: string | null): string =>
  isHeroMode(mode) ? HERO_IMAGE_PROMPT_SYSTEM : IMAGE_PROMPT_SYSTEM;

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
