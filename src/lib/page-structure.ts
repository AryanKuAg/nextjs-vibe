/**
 * The page's STRUCTURE vocabulary — not its taste.
 *
 * These are the choices the Build Brief must make as data rather than prose, so
 * code can check them: which shape each section takes, which surface it sits on,
 * and which aesthetic direction the page commits to. Enforcement lives in
 * autonomous.ts (enforceLayoutVariety, enforceSurfaceRhythm), because asking a
 * model for variety in a sentence has never once produced it.
 *
 * There are deliberately NO style rules here. An earlier version carried a large
 * vendored design-taste ruleset — one accent colour, banned palettes, no
 * shadows, prescribed type scales — and it made every generated site look like
 * the last one. The look is now the model's to decide; only the structure is
 * constrained.
 */

/**
 * The layout shapes a section may take.
 *
 * This is an enum rather than prose on purpose. Asking a model to "vary the
 * layout" is a wish it quietly ignores — the same way it printed 01/02/03 under
 * a rule that banned section numbers. Making it a field the brief MUST fill
 * turns the instruction into data, which code can then check and repair.
 */
export const LAYOUT_FAMILIES = [
  "split",
  "image-band",
  "statement",
  "bordered-rows",
  "offset-grid",
  "sticky-list",
  "column-pair",
  "marquee",
  "stacked-cards",
  "tall-portrait",
  // Escape hatch, and the point of the whole list: a section that wants a shape
  // nobody wrote down says so and describes it in prose instead. Choosing from
  // ten fixed shapes is what made every page a stack of the same bands.
  "invent",
  "footer",
] as const;

export type LayoutFamily = (typeof LAYOUT_FAMILIES)[number];

/**
 * The background surface a section sits on.
 *
 * This is the single biggest lever on whether the page below the video looks
 * like a real business site or a wall of text. Sites that read as professional
 * — Stripe, Linear, Vercel, Outrank — move between surfaces as you scroll:
 * base, then a tinted band, then a full accent block, then back. Sites that
 * read as generated put every section on the same flat colour.
 */
export const SECTION_SURFACES = ["base", "tinted", "inverted", "accent"] as const;

export type SectionSurface = (typeof SECTION_SURFACES)[number];

export const SURFACE_GUIDE: Record<SectionSurface, string> = {
  "base": "The page's own background. The default resting surface.",
  "tinted": "A subtle step away from base — the accent at 4-8% opacity, or one step lighter/darker in the neutral ramp. Enough to read as a different panel, never as a different theme.",
  "inverted": "Flipped against the page: light where the page is dark, dark where it is light. Full-bleed. A deliberate change of gear, with text colours flipped to match.",
  "accent": "A full-bleed block of the accent colour at full strength, with contrasting text on it. The loudest moment on the page. Use it ONCE, for the section that most deserves attention.",
};

/** What each family means, rendered into the brief so the agent builds the right thing. */
export const LAYOUT_FAMILY_GUIDE: Record<LayoutFamily, string> = {
  "split": "Asymmetric split: content on 7 columns, visual on 5 (or reversed). Never a 50/50 centre line.",
  "image-band": "Full-bleed photograph spanning the viewport width, copy overlaid on it or butted hard against its edge.",
  "statement": "One oversized sentence carrying the whole section. Everything else stripped away. Generous air.",
  "bordered-rows": "Full-width rows of title + description + meta, separated by 1px rules. No cards.",
  "offset-grid": "Grid of unequal tiles — one double-width tile beside two singles. Exactly as many cells as items.",
  "sticky-list": "The heading pins (sticky top-24) while the rows scroll past it.",
  "column-pair": "Two unequal text columns, editorial style, with an image hanging into the margin.",
  "marquee": "A horizontal strip of related words or names, moving slowly. Maximum ONE per page.",
  "stacked-cards": "Cards that overlap slightly as they scroll, framer-motion only, never GSAP.",
  "tall-portrait": "A tall portrait-format image beside a short list or a set of short paragraphs.",
  "invent": "A structure not on this list — see the layout description, which defines it in full.",
  "footer": "The closing section: navigation, contact, legal line. No images.",
};

/**
 * Aesthetic directions the brief picks between.
 *
 * One universal taste module made every site look like a sibling of the last
 * one. The direction is chosen per brief from the user's own words, and only
 * that block is injected — so two different requests genuinely diverge instead
 * of converging on the same safe page.
 */
export const DESIGN_DIRECTIONS = {
  "editorial": `
DIRECTION: EDITORIAL
- Typography leads. A magazine feel: strong hierarchy, real column widths, text you want to read.
- Type: a distinctive display face for headings against a quiet, highly legible body face. Large size jumps between levels.
- Space: wide margins, generous leading, long measure (60-70ch). Let paragraphs breathe.
- Edges: hairline 1px rules as the main separator. Corners sharp or barely rounded (0-4px).
- Colour: paper-like base, ink-like text, one restrained accent used almost never.
- Motion: minimal. Text and images fade up on entry, nothing loops.
- Signature move: a pull-quote at display size breaking out of the text column.`,

  "brutalist": `
DIRECTION: BRUTALIST
- Structure is visible. Swiss grid, raw edges, nothing softened or apologised for.
- Type: one heavy grotesque doing all the work. Enormous headlines, tight tracking, uppercase used deliberately.
- Space: dense and deliberate. Elements butt against each other and against the viewport edge.
- Edges: sharp corners only, zero radius anywhere. Thick 2px borders instead of hairlines.
- Colour: high contrast, near-black and off-white, one loud accent at full strength.
- Motion: hard and fast. Instant state changes, no easing softness, no fades longer than 200ms.
- Signature move: an oversized outlined word (transparent fill, 1px stroke) crossing a section edge.`,

  "soft-premium": `
DIRECTION: SOFT PREMIUM
- Calm, expensive, unhurried. Nothing shouts.
- Type: a refined sans with generous letter-spacing on small caps, medium weights rather than black.
- Space: a lot of it. Sections breathe, content sits in the middle band of the viewport.
- Edges: consistently soft, 12-16px radius on every surface. One radius system, no mixing.
- Colour: low-saturation neutrals with a single muted accent. Nothing above ~60% saturation.
- Motion: slow and eased. Long fades, gentle scroll reveals, spring-like hover on interactive elements.
- Signature move: an image that scales up very slightly and slowly as it enters the viewport.`,

  "technical-minimal": `
DIRECTION: TECHNICAL MINIMAL
- Precise and quiet. The Linear feel: everything aligned, nothing decorative.
- Type: a neutral grotesque, tight sizes, mono for labels and figures.
- Space: strict rhythm on a visible baseline. Consistent gaps everywhere, no improvisation.
- Edges: small radius (6-8px), thin borders, subtle dividers.
- Colour: near-monochrome with one signal colour reserved for interactive elements only.
- Motion: functional only. Fast fades, no parallax, no loops.
- Signature move: a dense specification table or numbered row set treated as the section's centrepiece.`,

  "expressive-agency": `
DIRECTION: EXPRESSIVE AGENCY
- Confident and loud. Built to be remembered, not to be safe.
- Type: two faces in tension — a huge display face against a small tracked-out label face.
- Space: deliberately uneven. Content pushed to edges, big empty zones next to dense ones.
- Edges: mixed intentionally, but pick one system and repeat it.
- Colour: a bold accent used generously, including full-bleed accent panels.
- Motion: prominent. Staggered reveals, per-word headline entrances, an overlap or two on scroll.
- Signature move: a headline where one word is set in a contrasting treatment (italic, outlined or accent-filled).`,

  "warm-craft": `
DIRECTION: WARM CRAFT
- Made by hand, by people. Materials, texture, patience.
- Type: a humanist sans or a warm serif. Nothing geometric or cold.
- Space: comfortable rather than airy. Content sits close enough to feel gathered.
- Edges: soft but irregular in scale — a large radius on images, small on buttons.
- Colour: warm neutrals drawn from real materials, one earthy accent. Never pure grey.
- Motion: subtle. Slow fades, nothing mechanical or snappy.
- Signature move: a detail photograph at close range placed beside a short, plain-spoken paragraph.`,
} as const;

export type DesignDirection = keyof typeof DESIGN_DIRECTIONS;

/**
 * Structure rules for the Build Brief compiler.
 *
 * Successor to a much longer taste ruleset that dictated fonts, palettes and
 * type scales. That produced consistency at the cost of every site looking
 * alike, so the aesthetic calls are the compiler's own now. What remains is
 * structure — how many sections, what shape, what surface, how much substance —
 * plus the handful of things the product owner has asked for by name.
 */
export const BRIEF_STRUCTURE_RULES = `
Structure rules for the brief:
- DIRECTION: pick design_direction from the user's own words and industry, and commit to it hard. It is the single biggest reason two sites should not look alike. Deliberately vary it between projects rather than defaulting to one favourite.
- FONTS AND COLOUR ARE YOUR CALL: choose a Google Fonts pairing and an accent that genuinely suit THIS brand. No approved list, no banned list. Bold, quiet, warm, cold, saturated, monochrome — decide, and make it specific to this business rather than a safe default. Two different briefs should not land on the same pairing.
- SECTIONS: every content section picks a DIFFERENT layout_family from the fixed list, and the footer is always 'footer'. A repeat is reassigned automatically, so choosing well beats choosing twice.
- SURFACES: give the page a rhythm by moving between base, tinted, inverted and accent as it scrolls. Use accent exactly once, on the section that most deserves to shout. Never three sections in a row on the same surface.
- NEVER NUMBER ITEMS: no content_outline may ask for "1. X, 2. Y" or "Step 1 / Phase 02". Name the things; the order is visible without a number in front of it.
- BALANCED ITEM SETS: when a section holds a set of cards or rows, give EVERY item comparable weight — similar title length, similar description length. One item with three sentences beside two with six words renders as one full card and two empty ones.
- CONTENT PER SECTION: write outlines rich enough to fill a real component. A section that only supports a heading and two short lines is not a section — merge it or give it real substance: named items with descriptions, a comparison, a quote with attribution, concrete capabilities.
- COPY: realistic and specific, never lorem ipsum, never invented precise-sounding statistics, and no em-dashes (— or –) in any visible string.
`;

export const DESIGN_DIRECTION_NAMES = Object.keys(DESIGN_DIRECTIONS) as [DesignDirection, ...DesignDirection[]];
