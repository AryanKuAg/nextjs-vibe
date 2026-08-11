/**
 * Design-taste rules for generated sites.
 *
 * Adapted from "tasteskill" (https://github.com/Leonxlnx/taste-skill, MIT) —
 * an anti-slop frontend skill — and curated for Framerate's constraints:
 * Vite SPA, Tailwind v4, framer-motion, lucide-react, Google Fonts via @import,
 * a platform-generated video background, and a strict no-images rule.
 * Rules from the original skill that conflict with the platform (real photos,
 * motion/react imports, Phosphor icons, next/font, GSAP pinning, dual dark mode)
 * are intentionally overridden — platform rules always win.
 *
 * TASTE_MODULE      → injected into the code agent's system prompt.
 * TASTE_BRIEF_RULES → injected into the Build Brief compiler (creative director),
 *                     where fonts, palette, copy voice, and section variety are decided.
 * TASTE_CHECKLIST   → mechanical pre-flight items appended to the final checklist.
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

export const DESIGN_DIRECTION_NAMES = Object.keys(DESIGN_DIRECTIONS) as [DesignDirection, ...DesignDirection[]];

export const TASTE_MODULE = `
## DESIGN TASTE (anti-slop rules — adapted from tasteskill; the platform rules above always win)

### Design read, then set the three dials
Before writing code, silently form one line: "Reading this as: <site kind> for <audience>, with a <vibe> language." Then set three dials from that read and let them govern every layout, motion and density decision below. They are the reason two different briefs must not produce the same page.

- DESIGN_VARIANCE (1 = perfect symmetry, 10 = artsy chaos)
- MOTION_INTENSITY (1 = static, 10 = cinematic)
- VISUAL_DENSITY (1 = art gallery, 10 = packed cockpit)

Baseline 8 / 6 / 4. Adjust from the read:
- minimalist, calm, editorial, Linear-style -> 5-6 / 3-4 / 2-3
- premium consumer, luxury, Apple-adjacent -> 7-8 / 5-7 / 3-4
- agency, experimental, Awwwards, playful -> 9-10 / 8-10 / 3-4
- trust-first, public sector, regulated, accessibility-critical -> 3-4 / 2-3 / 4-5

Consequences you must honour:
- DESIGN_VARIANCE > 4 forbids centered section headers as the default. Reach for split composition, left-content/right-asset, asymmetric whitespace, scroll-pinned structure. Centering is allowed once, for a deliberate manifesto moment.
- MOTION_INTENSITY > 4 means the page must actually move: entrance transitions, scroll reveals on key sections, hover feedback on CTAs. Claiming motion and shipping a static page is a failure. If you cannot ship motion cleanly, drop the dial and ship a clean static page instead.
- VISUAL_DENSITY sets how much lives in one viewport. Low density is airy, never empty: see the content floor below.

### Typography
- Display headlines: default text-4xl md:text-6xl tracking-tighter leading-none. Go text-7xl+ ONLY when the headline is 3-5 words. A hero headline wrapping to 4 lines is a font-size error, not a copy error.
- Body: text-base leading-relaxed max-w-[65ch]. Never wall-of-text paragraphs.
- SANS-FIRST: default to a distinctive sans display from Google Fonts. Serif is only for genuinely editorial/luxury/publication briefs where you can say why THIS serif fits THIS brand. NEVER use Fraunces or Instrument Serif (the two LLM-favorite serifs). Inter only when the brief is deliberately neutral.
- EMPHASIS RULE: to emphasize a word inside a headline, use italic or bold of the SAME font. Never inject a random serif word into a sans headline for "visual interest".
- ITALIC DESCENDERS: an italic display word containing y g j p q needs leading-[1.1] minimum plus pb-1 on the wrapper, or the descender clips.

### Color
- ONE accent color, locked page-wide: the same accent in the hero is the accent in the footer. A second accent appearing in section 4 is a failure. Saturation under ~80%.
- THE LILA RULE: no AI-purple/violet glows, no purple-pink or blue-purple gradients, no neon outer glows, no gradient text on large headlines — unless the user explicitly asked for purple.
- PREMIUM-CONSUMER PALETTE BAN: for luxury/wellness/artisan/craft briefs, the default beige+cream background with brass/clay/oxblood accents and espresso text is BANNED (it is the #1 AI tell). Rotate real alternatives instead: cold silver+chrome+smoke; deep green+bone+amber; off-black+warm tan; cobalt+cream; terracotta+slate; pure monochrome+one bright pop.
- No pure #000000 or #ffffff — use off-black (zinc-950-like) and off-white.
- NO SHADOWS ANYWHERE (absolute): no text-shadow, no box-shadow, no drop-shadow, no glow, on any element — not on text, buttons, cards, navbars or panels. No shadow-*, drop-shadow-* or [text-shadow:...] utilities. Shadows read as cheap and dated. Separation comes from typography scale, weight, 1px borders, whitespace and the accent color.
- ONE THEME over the video: every beat and the navbar use the same text treatment, and nothing changes as the video scrubs.
- BELOW the video the opposite applies: sections MUST change surface. A page where every section sits on the same flat background reads as a wall of text, not a designed site. See the surface system in the mode module — it is the single biggest difference between a real business site and a generated one.

### Layout families — pick deliberately, never repeat
Before writing the sections, assign each one a DIFFERENT family from this list and write the assignment down in your head. A page of six sections uses at least five families.

  1. Asymmetric split (content 7 cols / asset 5 cols, or the reverse)
  2. Full-bleed image band with copy overlaid or butted against it
  3. Full-width statement: one oversized sentence, everything else stripped away
  4. Bordered rows: full-width lines of title + description + meta, divided by 1px rules
  5. Offset grid where tiles differ in size (a 2x tile beside two 1x tiles)
  6. Sticky-side list: the heading pins (sticky top-24) while rows scroll past it
  7. Editorial column pair: two unequal text columns with a hanging image
  8. Marquee strip of related words or names (max ONE per page)
  9. Stacked cards that overlap slightly as they scroll (framer-motion only, no GSAP)
  10. Tall portrait image beside a short list

Hard rules on top of that:
- ZIGZAG CAP: at most 2 consecutive "text one side, visual the other" sections. A third in a row is a failure — break it with a full-width band, a statement, or a bordered-row section.
- GRID CELL COUNT: a grid has exactly as many cells as you have content for. Three items means three cells, in a 2+1 or asymmetric trio — never a four-cell grid with one blank.
- SPLIT-HEADER BAN: no "giant headline left, small explainer paragraph floating right" section headers. Stack them: headline, then body at max-w-[65ch]. The split is only allowed when the right column carries a real visual or interactive element.
- GRID VARIATION: a multi-cell grid must not be six identical text cards. At least two or three cells carry real visual variation — a photograph, a tinted panel, an oversized numeral, a border treatment.
- ANTI-CENTER BIAS: don't center every hero and every section. Prefer split layouts, bottom-left anchoring, asymmetric grids (2fr 1fr 1fr), deliberate empty zones. Centered is fine for a manifesto-style statement, used once.
- HERO STACK DISCIPLINE: max 4 text elements in the hero — (optional eyebrow) + headline (≤2 lines) + subtext (≤20 words) + CTAs (1 primary, ≤1 secondary). BANNED inside the hero: trust strips ("Used by teams at..."), pricing teasers, feature bullet lists, tiny taglines under the CTAs. Those live in sections below.
- Hero content fits the first viewport: CTA visible without scrolling, top padding ≤ pt-24.
- Navigation renders on ONE line at desktop, height ≤ 80px. Condense labels or drop items if they don't fit.
- SECTION-LAYOUT-REPETITION BAN: each layout family (3-col grid, split text+visual, full-width statement, numbered rows, bento) appears at most ONCE per page. A 5-section page needs at least 4 different families. Max 2 consecutive "text one side, visual other side" sections.
- EYEBROW RESTRAINT: small uppercase tracking-widest labels above headings — max 1 per 3 sections (hero counts). The other sections: the headline alone is enough.
- SPLIT-HEADER BAN: no "giant headline left + small floating explainer paragraph right" section headers. Stack them: headline on top, body below at max-w-[65ch].
- Cards only when elevation means real hierarchy; otherwise separate with border-t, divide-y, or whitespace. Pick ONE corner-radius system for the page (all-sharp, all-soft ~12-16px, or all-pill for interactive) and never mix.
- Use min-h-[100dvh] instead of h-screen for full-height sections (mobile address bars break h-screen).
- Grid over flex-math: grid grid-cols-1 md:grid-cols-3 gap-6, never w-[calc(33%-1rem)]. Every multi-column layout declares its <768px collapse explicitly.

### Buttons, CTAs, forms
- Every CTA passes contrast (WCAG AA): no white-on-white. A CTA over the video is either a solid accent-color fill or a bordered/text button — flat, with no shadow, and never relying on a scrim.
- CTA labels: max 3 words, never wrapping to 2 lines at desktop.
- ONE LABEL PER INTENT: "Get in touch" / "Contact us" / "Let's talk" are the same intent — pick one label and reuse it everywhere (nav, hero, footer).
- Tactile feedback: active:scale-[0.98] or a 1px press on buttons.
- Forms: label above input, error below, never placeholder-as-label.

### Copy
- Section headlines ≤ 8 words; sub-paragraphs ≤ 25 words. Quotes ≤ 3 lines with real attribution (name + role), never name-only.
- No filler verbs: "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize", "Supercharge". Concrete verbs only.
- No "John Doe"/"Jane Smith"/"Acme"/"Nexus" — invent specific, realistic, locale-appropriate names.
- No fake-precise invented numbers (92%, 4.1×, 13.4 lb) unless the brief provides them; round honest numbers or none.
- Re-read every visible string before finishing: anything grammatically broken, mock-poetic, or "AI trying to sound thoughtful" gets rewritten into a plain functional sentence.
- EM-DASH BAN (zero tolerance): the characters — and – never appear anywhere visible: headlines, body, buttons, captions, quotes, attribution. Use a comma, period, colon, or plain hyphen (-). This is the single most-violated AI tell.

### Minimal is NOT empty (content floor)
"Minimal" means restrained styling, never absent substance. A section whose cells contain 2-3 words surrounded by dead space reads as unfinished, not designed. Hard floors:
- Every list/grid cell (destination, feature, service) carries at least: a title, a one-line descriptor, AND a 1-2 sentence description or a meta row. Never title-only cells.
- Every section has a designed ARTIFACT beyond plain text: numbered rows with real descriptions, oversized stat tiles, a marquee strip, an oversized outlined display word, a big pull-quote with a giant quotation mark, a bordered card set, or an inline SVG diagram/mark. Pick per section, never zero.
- Distribute weight across the viewport: if the left half holds a huge heading, the right half carries content (rows, cards, copy), not emptiness. Deliberate negative space is one zone per section, not the whole section.

### Cool-factor menu (pick at least 3 per page, spread across different sections)
- An oversized OUTLINED display word (color: transparent; WebkitTextStroke: 1px accent or 1px currentColor) beside or behind a filled headline.
- One accent-colored or italic word inside a key headline (same font family).
- Bordered cards (1px border, transparent fill, hover: border-accent + -translate-y-1). Glass/blur fills are allowed ONLY on solid-background sections (hero-only mode below the hero, or standard mode) — NEVER over the video, where all panels stay border-only and transparent.
- A full-width marquee strip of related words (max one per page).
- A sticky split section: heading pinned (sticky top-24) while rows scroll past it.
- Oversized numerals (text-7xl+, accent, font-mono or tracking-tighter) as visual anchors in numbered content.
- A giant decorative quotation mark (text-[8rem]+, accent, 20% opacity) behind a testimonial.
- Per-word or per-character staggered headline reveal on the hero (Framer Motion variants).
- Two display type scales in tension on one screen (e.g. clamp 7rem headline + small uppercase tracked meta column).

### Motion
- Every animation must be justifiable in one sentence: hierarchy, storytelling, feedback, or state change. "It looks cool" is not a reason. Informational sections can stay still.
- Max ONE marquee per page.
- Animate ONLY transform and opacity. Never top/left/width/height.
- Never window.addEventListener("scroll") or scroll math in useState — use framer-motion useScroll/useTransform/useMotionValue and whileInView.
- Honor prefers-reduced-motion: loops, parallax, and scroll effects collapse to static.

### Hard-banned AI tells
- Version labels in the hero (BETA, V0.6, EARLY ACCESS) unless the brief is literally a launch.
- NUMBERED ITEM TITLES — ZERO TOLERANCE, ANYWHERE. Never "1. Optical Systems", never "01 — Surveillance", never "Step 2", never "Phase 03", never a big faded numeral behind a card. This applies to card titles, list rows, feature headings, process steps and grid cells, not just eyebrows. The title alone is the label. If the order genuinely matters, the reader can see the order — that is what a list is. A numbered prefix adds nothing and is the fastest way to make a page look machine-made.
- Section-number eyebrows (01 · Capabilities, 00/INDEX) and pagination labels on tiles (01/4).
- Scroll cues ("Scroll to explore", ↓, animated mouse icons). The user knows how scrolling works.
- Locale/time/weather strips ("LIS 14:23 · 18°C"), decoration text strips at hero bottom ("BRAND. MOTION. SPATIAL."), vertical rotated text, crosshair/hairline grid decoration.
- Pills/tags overlaid on media, photo-credit-style captions as decoration, version footers (v1.4.2, Build 0048) on marketing pages.
- Decorative colored status dots (only real semantic state earns a dot, max one per page), middle-dot chains ("a · b · c · d"), border-t AND border-b on every list row, filled progress-bar tracks as comparison visuals, custom mouse cursors.
- Div-built fake screenshots / fake dashboards / fake terminals. Represent product value with typography, numbers, real mini-components, or nothing.

### Platform overrides (these WIN over anything above or in the user's request)
- IMAGES ONLY FROM THE BRIEF: the only permitted <img> src values are URLs the Build Brief lists, and only in the solid-background sections below the video. Never invent one, never link picsum/Unsplash/a stock site, never use a CSS background-image, never place a photo over the video. Logo walls, if asked for, use inline-SVG monogram marks or are skipped. A brief-supplied photo gets a fixed aspect ratio and object-cover so nothing reflows as it loads.
- IMAGES ARE STRUCTURE, NOT DECORATION: use every image the brief supplies, and let it shape the section — a full-bleed band the copy sits against, a tall portrait beside a list, an offset pair breaking the grid, a photo bleeding off one edge. A photograph centred in a rounded rectangle with a caption under it is the default nobody chose. A text-only page is not minimalism, it is unfinished.
- Icons: lucide-react only (platform constraint), one consistent strokeWidth page-wide.
- Fonts: Google Fonts via @import in src/index.css only.
- Animation: framer-motion imported from "framer-motion" (never "motion/react"), no GSAP, no lenis, no three.js.
- The video background architecture defined in the MODE section is untouchable.
`;

export const TASTE_BRIEF_RULES = `
Taste rules for the brief (anti-generic; bake these into your choices):
- FONTS (Google Fonts only): default to a distinctive sans display, rotating between projects: Space Grotesk, Manrope, Outfit, Sora, Archivo, Bricolage Grotesque, Schibsted Grotesk, Familjen Grotesk, Instrument Sans, Geist, Syne, Inter Tight. Serif ONLY for genuinely editorial/luxury briefs (then: Playfair Display, EB Garamond, Cormorant Garamond, Newsreader, Spectral) and NEVER Fraunces or Instrument Serif. Inter only for deliberately neutral briefs.
- ACCENT: exactly one accent color, saturation under ~80%, used consistently everywhere. No AI-purple defaults. For premium/luxury/artisan/wellness briefs the beige+brass+espresso palette is banned; rotate: cold silver+chrome, deep green+bone+amber, off-black+warm tan, cobalt+cream, terracotta+slate, monochrome+one bright pop.
- DIRECTION: pick design_direction from the user's own words and industry, and commit to it. It is the single biggest lever on whether this site looks like the last one. Do not reach for the same direction every time.
- DIALS: set DESIGN_VARIANCE, MOTION_INTENSITY and VISUAL_DENSITY (baseline 8/6/4) from the design read, and let them drive the layout notes you write. Minimalist/editorial briefs go 5-6/3-4/2-3; luxury 7-8/5-7/3-4; agency or experimental 9-10/8-10/3-4; trust-first 3-4/2-3/4-5.
- SECTIONS: every content section picks a DIFFERENT layout_family from the fixed list, and the footer is always 'footer'. A repeat will be reassigned automatically, so choosing well is better than choosing twice. Max 4 text elements in the hero; hero subtext ≤ 20 words.
- SURFACES: give the page a rhythm by moving between base, tinted, inverted and accent as it scrolls. Use accent exactly once, on the section that most deserves to shout. Never three sections in a row on the same surface. A page that stays on one surface is the clearest sign of a generated site, and it is the first thing a business owner notices.
- NEVER NUMBER ITEMS: no content_outline may ask for "1. X, 2. Y, 3. Z" or "Step 1 / Phase 02". Name the things. The order is visible without a number in front of it.
- BALANCED ITEM SETS: when a section holds a set of cards or rows, give EVERY item the same weight — a title of similar length and a description of similar length. One item with three sentences beside two with six words renders as one full card and two mostly-empty ones.
- CONTENT PER SECTION: write outlines rich enough to fill a real component. A section that only supports a heading and two short lines is not a section — merge it into another or give it real substance: named items with descriptions, a comparison, a quote with attribution, a set of concrete capabilities.
- CONTENT RICHNESS: every list/grid section's content_outline must name 3+ concrete items, EACH with a title plus a one-line description (e.g. "Patagonia: wind-carved granite, 9-day traverses with local gauchos"). Title-only or coordinate-only cells make the site feel empty. Testimonial quotes get a real person's name + role, never a place name.
- COPY: headlines ≤ 8 words, concrete verbs only (never "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize"), realistic specific names (never "Acme"/"John Doe"), no invented fake-precise statistics, and ZERO em-dashes (—/–) in any copy you write: use commas, periods, or colons.
- Imagery is requested ONLY through a section's image_query, at most twice per page, and only where a real photograph carries meaning. Content outlines never describe screenshots, avatars, logo images or illustrations; those come from typography, numbers, lists and inline SVG marks.
`;

export const TASTE_CHECKLIST = `
- ZERO em-dashes (— or –) anywhere visible; hyphens/commas/periods only
- One accent color and one corner-radius system used consistently page-wide
- Eyebrow labels: max 1 per 3 sections; no section-number eyebrows (01 ·), no version labels (BETA), no scroll cues
- Every CTA: readable contrast, ≤3 words, no wrapping, one label per intent across the page
- Hero: ≤4 text elements, headline ≤2 lines, subtext ≤20 words, CTA visible without scrolling
- Three dials set from the design read, and the page visibly reflects them (variance > 4 means no centered default; motion > 4 means the page actually moves)
- No two sections share the same layout family; at most 2 consecutive text-and-visual splits; every grid has exactly as many cells as it has content
- No split-header sections (giant headline left, small paragraph right) unless the right column holds a real visual
- Every supplied image is used, placed structurally rather than centred in a rounded box, and at least two cells of any multi-cell grid carry visual variation
- Every list/grid cell has title + descriptor + description (no 3-word cells); every section has one designed artifact; ≥3 cool-factor moves used across the page
- No filler-verb copy, no "Acme"/"John Doe" names, no fake-precise numbers, no div-built fake screenshots`;
