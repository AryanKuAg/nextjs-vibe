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
      images: [template.homescreenImgSrc],
    })),
    { url: absoluteUrl("/use-cases"), lastModified: USE_CASES_UPDATED },
    ...USE_CASES.map((useCase) => ({
      url: absoluteUrl(`/use-cases/${useCase.slug}`),
      lastModified: USE_CASES_UPDATED,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated,
      ...(post.coverImage ? { images: [absoluteUrl(post.coverImage)] } : {}),
    })),
    ...["/terms", "/privacy", "/cookies", "/compliance"].map((path) => ({
      url: absoluteUrl(path),
      lastModified: POLICIES_UPDATED,
    })),
  ];
}
