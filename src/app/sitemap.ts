import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { CATALOG_UPDATED, TEMPLATE_PAGES } from "@/lib/templates/catalog";
import { USE_CASES, USE_CASES_UPDATED } from "@/lib/use-cases";

/**
 * When each page's content last changed, not when the site was last deployed.
 * Search engines learn to ignore a lastmod that moves on every build, so these
 * dates move only when the page itself does.
 */
const HOME_UPDATED = "2026-10-04";
/** The "Last updated" date printed on each policy. */
const POLICIES_UPDATED = "2026-04-16";

/**
 * Hosts whose images belong to Framerate. Blog covers from stock libraries are
 * left out: the same photo sits on thousands of other sites, so listing it earns
 * nothing in image search, and those URLs carry query strings ("?q=80&w=1200").
 */
const OWN_IMAGE_HOSTS = new Set([new URL(SITE_URL).host, "assets.framerate.space"]);

/**
 * Next 15.3 writes sitemap values into the XML verbatim, without escaping. One
 * raw "&" made the entire file malformed, so Search Console couldn't read any
 * of it. If an upgrade starts escaping these itself, this would double up.
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Image entries for a page: our own images only, absolute and escaped. */
function ownImages(...sources: (string | undefined)[]): { images: string[] } | Record<string, never> {
  const images = sources.flatMap((source) => {
    if (!source) return [];
    const url = absoluteUrl(source);
    return OWN_IMAGE_HOSTS.has(new URL(url).host) ? [xmlEscape(url)] : [];
  });
  return images.length ? { images } : {};
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latestPost = posts.reduce((latest, post) => (post.updated > latest ? post.updated : latest), "");

  return [
    { url: SITE_URL, lastModified: HOME_UPDATED },
    { url: absoluteUrl("/blog"), lastModified: latestPost || HOME_UPDATED },
    { url: absoluteUrl("/templates"), lastModified: CATALOG_UPDATED },
    ...TEMPLATE_PAGES.map((template) => ({
      url: absoluteUrl(`/templates/${template.id}`),
      lastModified: CATALOG_UPDATED,
      ...ownImages(template.homescreenImgSrc),
    })),
    { url: absoluteUrl("/use-cases"), lastModified: USE_CASES_UPDATED },
    ...USE_CASES.map((useCase) => ({
      url: absoluteUrl(`/use-cases/${useCase.slug}`),
      lastModified: USE_CASES_UPDATED,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated,
      ...ownImages(post.coverImage),
    })),
    ...["/terms", "/privacy", "/cookies", "/compliance"].map((path) => ({
      url: absoluteUrl(path),
      lastModified: POLICIES_UPDATED,
    })),
  ];
}
