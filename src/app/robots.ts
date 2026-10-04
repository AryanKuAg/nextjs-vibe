import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everything public is open to every crawler, AI search and assistant bots
 * included: blocking them is what keeps a site out of AI answers. Only the
 * signed-in app and the API are closed, and those are private anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/projects", "/dashboard", "/manage", "/sso-callback"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
