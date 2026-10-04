import { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import { breadcrumbList, organizationNode } from "@/lib/structured-data";
import { JsonLd } from "@/components/json-ld";
import { BlogPostCard } from "@/modules/blog/ui/components/blog-post-card";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";

const DESCRIPTION =
  "Guides to building cinematic 3D websites with AI: scroll-driven design, WebGL performance, tool comparisons and how much a 3D website really costs.";

export const metadata: Metadata = pageMetadata({
  title: "3D Web Design & AI Website Guides",
  description: DESCRIPTION,
  path: "/blog",
});

export default function BlogIndex() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: "Framerate Blog",
    description: DESCRIPTION,
    url: absoluteUrl("/blog"),
    inLanguage: "en",
    publisher: organizationNode(),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      dateModified: post.updated,
      ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
      author: { "@type": "Organization", name: post.author, url: SITE_URL },
      url: absoluteUrl(`/blog/${post.slug}`),
    })),
  };

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <PillNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <header className="flex flex-col items-center mb-16">
          <h1 className="text-4xl md:text-5xl font-mono text-center text-white leading-[1] font-[500] mb-4">
            Framerate Blog
          </h1>
          <p className="text-center font-mono text-[#8A8A88] text-lg max-w-2xl">
            Insights on AI web design, 3D environments, and the cinematic future of the internet.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
