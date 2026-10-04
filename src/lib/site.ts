/**
 * The facts about Framerate that every public page, feed and schema block
 * repeats. One place, so the homepage, the blog, the sitemap and llms.txt can't
 * drift into describing three slightly different products.
 *
 * Keep this file free of server-only imports — client components read it too.
 */

export const SITE_URL = "https://framerate.space";
export const SITE_NAME = "Framerate";

/** The product in one line: what it is, for search results and AI answers. */
export const SITE_TAGLINE = "AI 3D Website Builder";

export const SITE_TITLE = "Framerate — AI 3D Website Builder for Cinematic Sites";

export const SITE_DESCRIPTION =
  "Describe your site and Framerate's AI builds a cinematic, interactive 3D website in minutes. Edit it by chat, then publish it or export the code.";

export const CONTACT_EMAIL = "teamframerate@gmail.com";

/**
 * Profiles that are confirmed to be Framerate's own, for `sameAs`. A wrong
 * entry here tells search engines the brand is someone else, so add a profile
 * only once its URL has been checked to resolve to the real account.
 */
export const SOCIAL_PROFILES = [
  "https://www.youtube.com/channel/UCfrB9eKkVyu7ZT2Xdj-Amsg",
  "https://www.instagram.com/framerate.space/",
  "https://www.linkedin.com/company/framerate-space/",
];

/** 1200×630, the size every social card and Google Discover expects. */
export const DEFAULT_OG_IMAGE = {
  url: "/social_preview.png",
  width: 1200,
  height: 630,
  alt: "Framerate — AI 3D website builder",
};

export const LOGO_URL = `${SITE_URL}/icon-512.png`;

/** Absolute URL for a site path, for schema and feeds that can't take relative ones. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const url = new URL(path, SITE_URL).toString();
  // `new URL("/", base)` keeps the trailing slash; the canonical homepage has none.
  return url === `${SITE_URL}/` ? SITE_URL : url;
}
