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

export const TASTE_MODULE = `
## DESIGN TASTE (anti-slop rules — adapted from tasteskill; the platform rules above always win)

### Design read
Before writing code, silently form one line: "Reading this as: <site kind> for <audience>, with a <vibe> language." Let that read pick the typography, palette, and layout energy. Do not reach for the same default aesthetic every time.

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
- No pure #000000 or #ffffff — use off-black (zinc-950-like) and off-white. Tint shadows toward the background hue; never pure-black drop shadows.
- ONE THEME per page. Sections never flip from dark to light mid-scroll (in full-page video mode the "theme" is the overlay treatment — keep it consistent in every section).

### Layout
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
- Every CTA passes contrast (WCAG AA): no white-on-white. A CTA over the video is either a solid accent-color fill or a bordered/text button with text-shadow — never relies on a scrim.
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
- Section-number eyebrows (01 · Capabilities, 00/INDEX), pagination labels on tiles (01/4), and "Stage 1 / Step 2 / Phase 03" step labels — the step's verb is the label.
- Scroll cues ("Scroll to explore", ↓, animated mouse icons). The user knows how scrolling works.
- Locale/time/weather strips ("LIS 14:23 · 18°C"), decoration text strips at hero bottom ("BRAND. MOTION. SPATIAL."), vertical rotated text, crosshair/hairline grid decoration.
- Pills/tags overlaid on media, photo-credit-style captions as decoration, version footers (v1.4.2, Build 0048) on marketing pages.
- Decorative colored status dots (only real semantic state earns a dot, max one per page), middle-dot chains ("a · b · c · d"), border-t AND border-b on every list row, filled progress-bar tracks as comparison visuals, custom mouse cursors.
- Div-built fake screenshots / fake dashboards / fake terminals. This platform has no images: represent product value with typography, numbers, real mini-components, or nothing.

### Platform overrides (these WIN over anything above or in the user's request)
- NO images of any kind — no <img>, no background-image URLs, no picsum/Unsplash, no CDN logos. Logo walls, if asked for, use simple inline-SVG monogram marks or are skipped.
- Icons: lucide-react only (platform constraint), one consistent strokeWidth page-wide.
- Fonts: Google Fonts via @import in src/index.css only.
- Animation: framer-motion imported from "framer-motion" (never "motion/react"), no GSAP, no lenis, no three.js.
- The video background architecture defined in the MODE section is untouchable.
`;

export const TASTE_BRIEF_RULES = `
Taste rules for the brief (anti-generic; bake these into your choices):
- FONTS (Google Fonts only): default to a distinctive sans display, rotating between projects: Space Grotesk, Manrope, Outfit, Sora, Archivo, Bricolage Grotesque, Schibsted Grotesk, Familjen Grotesk, Instrument Sans, Geist, Syne, Inter Tight. Serif ONLY for genuinely editorial/luxury briefs (then: Playfair Display, EB Garamond, Cormorant Garamond, Newsreader, Spectral) and NEVER Fraunces or Instrument Serif. Inter only for deliberately neutral briefs.
- ACCENT: exactly one accent color, saturation under ~80%, used consistently everywhere. No AI-purple defaults. For premium/luxury/artisan/wellness briefs the beige+brass+espresso palette is banned; rotate: cold silver+chrome, deep green+bone+amber, off-black+warm tan, cobalt+cream, terracotta+slate, monochrome+one bright pop.
- SECTIONS: give each section a DIFFERENT layout family in its layout notes (e.g. asymmetric split, numbered full-width rows, oversized statement, offset 3-col grid, minimal footer). Never two sections with the same shape. Max 4 text elements in the hero; hero subtext ≤ 20 words.
- CONTENT RICHNESS: every list/grid section's content_outline must name 3+ concrete items, EACH with a title plus a one-line description (e.g. "Patagonia: wind-carved granite, 9-day traverses with local gauchos"). Title-only or coordinate-only cells make the site feel empty. Testimonial quotes get a real person's name + role, never a place name.
- COPY: headlines ≤ 8 words, concrete verbs only (never "Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize"), realistic specific names (never "Acme"/"John Doe"), no invented fake-precise statistics, and ZERO em-dashes (—/–) in any copy you write: use commas, periods, or colons.
- Content is image-free by platform rule: never describe photos, screenshots, avatars, or logo images in content outlines; use typography, numbers, lists, and inline SVG marks instead.
`;

export const TASTE_CHECKLIST = `
- ZERO em-dashes (— or –) anywhere visible; hyphens/commas/periods only
- One accent color and one corner-radius system used consistently page-wide
- Eyebrow labels: max 1 per 3 sections; no section-number eyebrows (01 ·), no version labels (BETA), no scroll cues
- Every CTA: readable contrast, ≤3 words, no wrapping, one label per intent across the page
- Hero: ≤4 text elements, headline ≤2 lines, subtext ≤20 words, CTA visible without scrolling
- No two sections share the same layout family; max 2 consecutive split-layout sections
- Every list/grid cell has title + descriptor + description (no 3-word cells); every section has one designed artifact; ≥3 cool-factor moves used across the page
- No filler-verb copy, no "Acme"/"John Doe" names, no fake-precise numbers, no div-built fake screenshots`;
