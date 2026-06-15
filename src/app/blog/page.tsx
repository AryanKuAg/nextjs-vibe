import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";

export const metadata: Metadata = {
  title: "Blog – Framerate",
  description: "Read the latest thoughts on AI web design, 3D websites, and the future of the internet from the Framerate team.",
  openGraph: {
    title: "Blog – Framerate",
    description: "Read the latest thoughts on AI web design, 3D websites, and the future of the internet from the Framerate team.",
    type: "website",
    url: "https://framerate.space/blog",
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Framerate Blog",
    "description": "Thoughts on AI web design, 3D websites, and the future of the internet.",
    "url": "https://framerate.space/blog",
    "blogPost": posts.map((post) => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "datePublished": post.date,
      "author": {
        "@type": "Organization",
        "name": post.author,
      },
      "url": `https://framerate.space/blog/${post.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-onest">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PillNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <div className="flex flex-col items-center mb-16">
          <h1 className="text-4xl md:text-5xl font-mono text-center text-white leading-[1] font-[500] mb-4">
            Framerate Blog
          </h1>
          <p className="text-center font-mono text-[#8A8A88] text-lg max-w-2xl">
            Insights on AI web design, 3D environments, and the cinematic future of the internet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-[#282828] rounded-[16px] overflow-hidden hover:ring-1 hover:ring-white/20 transition-all"
            >
              <div className="relative aspect-[16/9] w-full bg-[#1a1a1a] overflow-hidden">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center text-xs text-[#8A8A88] mb-3 font-mono">
                  <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  <span className="mx-2">•</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-xl text-white font-[500] mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-[#CCCCCC] line-clamp-3 mb-4 flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center text-xs text-white font-mono mt-auto">
                  Read Article &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
