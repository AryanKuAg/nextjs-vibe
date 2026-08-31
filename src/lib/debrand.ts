/**
 * Removing the build vendor's branding from anything a customer can see.
 *
 * v0 scaffolds every project with its own logo as the app icon and sets
 * `generator` in the layout's metadata. Left alone, both travel all the way to
 * the customer: the icon shows in the browser tab of the published site, and
 * the generator tag sits in its page source. Either one tells anyone the
 * customer shows the site to which API built it.
 *
 * Two surfaces hand that material over, so the rules live here rather than in
 * one of them: the published static export (see `publish-site.ts`) and the
 * source zip behind "Full site export" (see the chat download route).
 */

/**
 * Unbranded on purpose: a plain rounded square carrying neither the vendor's
 * identity nor ours, since these are the customer's own sites.
 */
export const NEUTRAL_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<path fill="#8a8a8a" fill-rule="evenodd" d="M10 3h12a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7V10a7 7 0 0 1 7-7Zm6 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/>' +
  "</svg>";

/**
 * Next's icon conventions as they appear in a *source tree* — under `app/`
 * (with or without a `src/` root) or `public/`.
 *
 * Anchored rather than matched by suffix: a site may legitimately ship
 * `public/images/hero-icon.svg`, and deleting the customer's own artwork to
 * fix our branding problem would be a worse bug than the one being fixed.
 */
const SOURCE_ICON_PATH =
  /^(?:(?:src\/)?app|public)\/(?:favicon\.ico|(?:apple-)?icon\d*\.(?:ico|png|jpe?g|svg)|apple-touch-icon[^/]*\.png)$/i;

export function isSourceIconPath(path: string): boolean {
  return SOURCE_ICON_PATH.test(path.replace(/^\.?\//, ""));
}

/** Where a replacement icon goes, honouring whichever root the project uses. */
export function sourceIconPathFor(paths: string[]): string {
  return paths.some((path) => path.startsWith("src/app/")) ? "src/app/icon.svg" : "app/icon.svg";
}

/**
 * Drops the `generator` entry from a Next `metadata` export.
 *
 * v0 writes `generator: 'v0.app'` into the generated layout, which Next renders
 * as `<meta name="generator">`. Matching just the one property leaves the rest
 * of the object — title, description, openGraph — exactly as the customer's
 * build produced it. A miss is harmless: nothing here depends on the match.
 */
export function stripGeneratorMetadata(source: string): string {
  return source.replace(/^\s*generator\s*:\s*(['"`])[^'"`]*\1\s*,?[^\S\n]*\n/gim, "");
}
