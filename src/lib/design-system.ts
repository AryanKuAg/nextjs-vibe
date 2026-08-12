/**
 * Picks a real design system for a site, from data rather than from a model's
 * imagination.
 *
 * The old approach was six hand-written aesthetic directions and a rule telling
 * the brief compiler to "vary them". It never did, and every site came out with
 * the same feel. This replaces that with 192 curated product types, each already
 * matched to a palette, a style family and a typographic pairing.
 *
 * Two things make the palettes worth more than their colour values: they were
 * contrast-checked upstream (several carry "adjusted for WCAG 3:1" notes), and
 * their column names are already shadcn's token set, so a palette drops straight
 * into :root as CSS variables and every component adopts it.
 *
 * SCOPE: this describes the ordinary website BELOW the background video. The
 * video half — the scroll track, the beats, the hero overlay — keeps its own
 * rules, because its text colour comes from measuring the actual footage and no
 * palette catalogue knows what that footage looks like.
 */

import data from "@/lib/design-data/uupm.json";

export interface Palette {
  primary: string; onPrimary: string;
  secondary: string; onSecondary: string;
  accent: string; onAccent: string;
  background: string; foreground: string;
  card: string; cardForeground: string;
  muted: string; mutedForeground: string;
  border: string; ring: string;
  destructive: string; onDestructive: string;
}

interface Product {
  id: number; type: string; keywords: string[];
  style: string; alternateStyles: string; landingPattern: string;
  paletteFocus: string; notes: string;
}

interface Style {
  name: string; keywords: string[]; effects: string;
  promptKeywords: string; bestFor: string; avoid: string;
}

interface FontPairing {
  name: string; heading: string; body: string;
  mood: string[]; bestFor: string; cssImport: string;
}

export interface DesignSystem {
  productType: string;
  style: Style | null;
  palette: Palette;
  fonts: FontPairing | null;
  landingPattern: string;
  notes: string;
}

const products = data.products as Product[];
const palettes = data.palettes as Record<string, Palette>;
const styles = data.styles as Style[];
const typography = data.typography as FontPairing[];

const words = (text: string) =>
  text.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];

/**
 * Words that name a FORMAT or VENUE rather than a domain.
 *
 * These are rare in the catalogue, so rarity-weighting rates them highly, but
 * they carry no information about what the business actually is. Without this
 * list "a yoga studio" and "an indie game studio" both matched Photography
 * Studio, whose keywords are literally "photography, studio".
 */
const AMBIGUOUS_KEYWORDS = new Set([
  "studio", "app", "guide", "tool", "tools", "platform", "site", "website",
  "page", "general", "online", "digital", "service", "services", "company",
  "business", "brand", "system", "solution", "solutions",
]);

/**
 * How much each keyword is worth: rarer in the catalogue means more telling.
 * "crypto" appears once and nails the match; "health" appears in a dozen
 * products and should not decide anything on its own.
 */
const documentFrequency = (() => {
  const counts = new Map<string, number>();
  for (const product of products) {
    for (const keyword of new Set(product.keywords)) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return counts;
})();

const weight = (keyword: string) =>
  Math.log(products.length / (documentFrequency.get(keyword) ?? 1));

/** Below this, the evidence is too thin to justify forcing a design system. */
const MATCH_THRESHOLD = 3.5;

function scoreProduct(product: Product, prompt: string, promptWords: Set<string>): number {
  let score = 0;

  for (const keyword of new Set(product.keywords)) {
    if (!keyword || AMBIGUOUS_KEYWORDS.has(keyword)) continue;

    if (keyword.includes(" ")) {
      // A multi-word keyword has to appear as a phrase, and is worth more when it does.
      if (prompt.includes(keyword)) score += 1.6 * weight(keyword);
    } else if (promptWords.has(keyword)) {
      score += weight(keyword);
    }
  }

  // The product's own name is a label, not a curated matching key, so it only
  // nudges.
  for (const word of new Set(words(product.type))) {
    if (promptWords.has(word) && !AMBIGUOUS_KEYWORDS.has(word)) score += 0.4 * weight(word);
  }

  return score;
}

function findStyle(name: string): Style | null {
  if (!name) return null;
  const wanted = name.toLowerCase();
  // Product recommendations read like "Glassmorphism + Flat Design"; the style
  // table is keyed on families like "Glassmorphism". Match on the first part
  // that actually exists in the table.
  const parts = wanted.split(/\s*\+\s*|,\s*/).map((p) => p.trim()).filter(Boolean);

  for (const part of [...parts, wanted]) {
    const hit = styles.find((s) => s.name.toLowerCase().includes(part))
      ?? styles.find((s) => part.includes(s.name.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

function findFonts(product: Product, style: Style | null): FontPairing | null {
  const haystack = `${product.type} ${product.keywords.join(" ")} ${product.paletteFocus} ${style?.name ?? ""}`.toLowerCase();
  const hay = new Set(words(haystack));

  let best: FontPairing | null = null;
  let bestScore = 0;

  for (const pairing of typography) {
    let score = 0;
    for (const mood of pairing.mood) if (hay.has(mood)) score += 2;
    for (const word of words(pairing.bestFor)) if (hay.has(word)) score += 1;
    if (score > bestScore) { bestScore = score; best = pairing; }
  }

  // Deliberately no fallback to a default pairing: an unmatched brief should let
  // the model choose its own fonts rather than everyone landing on the same one.
  return bestScore > 0 ? best : null;
}

/**
 * Resolves the site request to a product type, palette, style and font pairing.
 * Returns null when nothing matches well enough to be worth forcing — in which
 * case the model designs from scratch, which is the better failure mode.
 */
export function resolveDesignSystem(sitePrompt: string): DesignSystem | null {
  const prompt = sitePrompt.toLowerCase();
  const promptWords = new Set(words(prompt));

  let best: Product | null = null;
  let bestScore = 0;

  for (const product of products) {
    const score = scoreProduct(product, prompt, promptWords);
    if (score > bestScore) { bestScore = score; best = product; }
  }

  if (!best || bestScore < MATCH_THRESHOLD) return null;

  const palette = palettes[String(best.id)];
  if (!palette) return null;

  const style = findStyle(best.style);

  return {
    productType: best.type,
    style,
    palette,
    fonts: findFonts(best, style),
    landingPattern: best.landingPattern,
    notes: best.notes,
  };
}

/**
 * Renders the system for the Build Brief.
 *
 * Written as VALUES the site should adopt, never as a ruleset. The palette is
 * emitted as the CSS custom properties the sandbox's shadcn components read, so
 * theming the whole site is one block in index.css rather than a colour decision
 * repeated in every component.
 */
export function renderDesignSystem(system: DesignSystem): string {
  const p = system.palette;

  const tokens = [
    `  --background: ${p.background};`,
    `  --foreground: ${p.foreground};`,
    `  --card: ${p.card};`,
    `  --card-foreground: ${p.cardForeground};`,
    `  --primary: ${p.primary};`,
    `  --primary-foreground: ${p.onPrimary};`,
    `  --secondary: ${p.secondary};`,
    `  --secondary-foreground: ${p.onSecondary};`,
    `  --accent: ${p.accent};`,
    `  --accent-foreground: ${p.onAccent};`,
    `  --muted: ${p.muted};`,
    `  --muted-foreground: ${p.mutedForeground};`,
    `  --border: ${p.border};`,
    `  --input: ${p.border};`,
    `  --ring: ${p.ring};`,
    `  --destructive: ${p.destructive};`,
    `  --destructive-foreground: ${p.onDestructive};`,
  ].join("\n");

  const lines: string[] = [
    `Design system for the sections BELOW the video (matched to "${system.productType}"):`,
    ``,
    `PALETTE — src/index.css already contains a ":root { ... }" block and an "@theme inline { ... }" block`,
    `below it. REPLACE THE VALUES INSIDE :root with these, and leave @theme inline exactly as it is —`,
    `that block is what turns these variables into the bg-background / text-muted-foreground / border-border`,
    `utilities, and rewriting the file over the top of it silently unstyles the whole site.`,
    `Do not add colours anywhere else; everything on the page reads from here.`,
    tokens,
    `  --radius: 0.625rem;`,
  ];

  if (system.fonts) {
    lines.push(
      ``,
      `TYPOGRAPHY — "${system.fonts.name}": ${system.fonts.heading} for headings, ${system.fonts.body} for body.`,
      `Import at the very top of src/index.css:`,
      system.fonts.cssImport,
    );
  }

  if (system.style) {
    lines.push(
      ``,
      `STYLE — ${system.style.name}.`,
      `Motion and surface treatment: ${system.style.effects}`,
      `Vocabulary to design from: ${system.style.promptKeywords}`,
      `This style is wrong for: ${system.style.avoid} — if the brand genuinely reads that way, say so in the brief and choose differently.`,
    );
  }

  lines.push(
    ``,
    `Context: ${system.notes}`,
    `A conventional section order for this kind of product is "${system.landingPattern}" — treat it as a`,
    `starting point for CONTENT, never for layout. How the page is composed is still entirely yours.`,
  );

  return lines.join("\n");
}
