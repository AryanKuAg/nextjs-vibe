import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://framerate.space";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  
  // Blog posts
  const posts = getAllPosts();
  const blogRoutes = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified,
    },
    {
      url: `${BASE_URL}/compliance`,
      lastModified,
    },
    ...blogRoutes,
  ];

  return staticRoutes;
}
