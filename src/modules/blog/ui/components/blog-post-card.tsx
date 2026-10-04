import Image from "next/image";
import Link from "next/link";

import type { BlogPostSummary } from "@/lib/blog";

/** Pinned to UTC: posts are dated by day, and a server west of Greenwich would show the day before. */
export function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The blog's article card, shared by the index and each post's "Keep reading" row. */
export function BlogPostCard({
  post,
  headingLevel: Heading = "h2",
}: {
  post: BlogPostSummary;
  /** h3 under a section that already has its own h2. */
  headingLevel?: "h2" | "h3";
}) {
  return (
    <article className="group flex flex-col bg-[#282828] rounded-[16px] overflow-hidden hover:ring-1 hover:ring-white/20 transition-all">
      <Link
        href={`/blog/${post.slug}`}
        className="flex flex-col flex-1"
      >
        <div className="relative aspect-[16/9] w-full bg-[#1a1a1a] overflow-hidden">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              No Image
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <header className="flex items-center text-xs text-[#8A8A88] mb-3 font-mono">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span className="mx-2">•</span>
            <span>{post.readTime}</span>
          </header>
          <Heading className="text-xl text-white font-[500] mb-3 group-hover:text-primary transition-colors">
            {post.title}
          </Heading>
          <p className="text-sm text-[#CCCCCC] line-clamp-3 mb-4 flex-1">
            {post.excerpt}
          </p>
          <div className="flex items-center text-xs text-white font-mono mt-auto">
            Read Article &rarr;
          </div>
        </div>
      </Link>
    </article>
  );
}
