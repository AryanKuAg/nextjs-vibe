import { PLANS } from "@/lib/pricing";
import {
  CONTACT_EMAIL,
  LOGO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_PROFILES,
  absoluteUrl,
} from "@/lib/site";

/**
 * Schema.org builders for the public pages. Kept to what each page actually
 * shows: Google treats markup describing content a visitor can't see as spam,
 * so nothing here invents ratings, reviews or prices that aren't on the page.
 */

const CONTEXT = "https://schema.org";
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The full organization node. Pages other than the homepage repeat it in full
 * rather than pointing at its @id, because Google does not resolve references
 * across pages.
 */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 512, height: 512 },
    email: CONTACT_EMAIL,
    sameAs: SOCIAL_PROFILES,
  };
}

/** Organization, WebSite and the product itself — the homepage's entity graph. */
export function homeGraph() {
  return {
    "@context": CONTEXT,
    "@graph": [
      { ...organizationNode(), description: SITE_DESCRIPTION },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": ORGANIZATION_ID },
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and a modern web browser",
        publisher: { "@id": ORGANIZATION_ID },
        // The plans are listed in the homepage FAQ, which is what makes them
        // fair to mark up here.
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: `${SITE_NAME} ${plan.title}`,
          price: plan.monthlyPrice,
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: plan.monthlyPrice,
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
          url: SITE_URL,
        })),
      },
    ],
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** An ordered list of pages, for hubs such as the blog index and the template gallery. */
export function itemList(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function blogPosting(post: {
  slug: string;
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified: string;
  author: string;
  keywords?: string[];
  wordCount: number;
}) {
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    "@context": CONTEXT,
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    // Google truncates headlines past 110 characters.
    headline: post.title.slice(0, 110),
    description: post.description,
    ...(post.image ? { image: [absoluteUrl(post.image)] } : {}),
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    // The byline is the team, so the author is the organization rather than a
    // made-up person.
    author: { "@type": "Organization", name: post.author, url: SITE_URL },
    publisher: organizationNode(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(post.keywords?.length ? { keywords: post.keywords.join(", ") } : {}),
    wordCount: post.wordCount,
    inLanguage: "en",
  };
}
