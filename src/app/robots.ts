import { MetadataRoute } from "next";

const BASE_URL = "https://framerate.space";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/terms", "/privacy", "/cookies", "/compliance"],
        disallow: ["/projects/", "/api/", "/manage/", "/sso-callback"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
