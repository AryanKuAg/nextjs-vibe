import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/site";

interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface PageMetadataInput {
  /** Without the brand; the root layout's template appends " | Framerate". */
  title: string;
  description: string;
  /** Site path, e.g. "/blog". Becomes the canonical URL. */
  path: string;
  image?: OgImage;
  /**
   * Use the title as written, without the brand suffix — for the homepage, and
   * for titles already too long to carry it without being cut off in results.
   */
  absoluteTitle?: boolean;
  /** Present only for articles; switches og:type to "article". */
  article?: {
    publishedTime: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
}

/**
 * Complete metadata for one public page.
 *
 * Next.js merges metadata shallowly: a page that sets `openGraph` replaces the
 * layout's whole `openGraph` object rather than adding to it. A page that
 * declared only an og:title would silently lose the image, site name and
 * locale. Building every page's block here keeps them complete.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  absoluteTitle = false,
  article,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const images = [{ ...image, url: absoluteUrl(image.url) }];

  const shared = {
    url,
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_US",
    images,
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: article
      ? {
          ...shared,
          type: "article",
          publishedTime: article.publishedTime,
          modifiedTime: article.modifiedTime ?? article.publishedTime,
          authors: article.authors,
          tags: article.tags,
        }
      : { ...shared, type: "website" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

/** Private surfaces: reachable, but never in an index. */
export const NO_INDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

/**
 * Fits a page title to what search results show (~60 characters), adding the
 * brand only when there is room for it. Long article titles keep their words
 * instead of losing the end to an ellipsis.
 */
export function fitTitle(title: string, max = 60): { title: string; absoluteTitle: boolean } {
  const branded = `${title} | ${SITE_NAME}`;
  return branded.length <= max ? { title, absoluteTitle: false } : { title, absoluteTitle: true };
}
