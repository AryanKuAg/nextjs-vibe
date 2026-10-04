import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { fitTitle, pageMetadata } from "@/lib/seo";
import { blogPosting, breadcrumbList } from "@/lib/structured-data";
import { JsonLd } from "@/components/json-ld";
import { BlogPostCard, formatPostDate } from "@/modules/blog/ui/components/blog-post-card";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";

interface Props {
  params: Promise<{ slug: string }>;
}

// Every post is known at build time; anything else is a 404 without touching
// the filesystem.
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return pageMetadata({
    ...fitTitle(post.title),
    description: post.excerpt,
    path: `/blog/${slug}`,
    ...(post.coverImage ? { image: { url: post.coverImage, alt: post.title } } : {}),
    article: {
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      tags: post.keywords,
    },
  });
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug);
  const isRevised = post.updated !== post.date;

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd
        data={blogPosting({
          slug,
          title: post.title,
          description: post.excerpt,
          image: post.coverImage,
          datePublished: post.date,
          dateModified: post.updated,
          author: post.author,
          keywords: post.keywords,
          wordCount: post.wordCount,
        })}
      />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${slug}` },
        ])}
      />

      <PillNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <Link href="/blog" className="inline-flex items-center text-[#8A8A88] hover:text-white mb-10 transition-colors font-mono text-sm">
          &larr; Back to Blog
        </Link>

        <article>
          <header className="mb-12">
            <h1 className="text-3xl md:text-5xl font-[500] text-white leading-tight mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center text-sm font-mono text-[#8A8A88] gap-4">
              <span>By {post.author}</span>
              <span className="hidden sm:inline">•</span>
              {isRevised ? (
                <time dateTime={post.updated}>Updated {formatPostDate(post.updated)}</time>
              ) : (
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              )}
              <span className="hidden sm:inline">•</span>
              <span>{post.readTime}</span>
            </div>
          </header>

          {post.coverImage && (
            <div className="relative aspect-[21/9] w-full bg-[#282828] rounded-[16px] overflow-hidden mb-12 border border-white/5">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div
            className="prose prose-invert prose-lg max-w-none prose-headings:font-sans prose-p:font-sans prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {relatedPosts.length > 0 && (
          <section aria-labelledby="keep-reading" className="mt-20">
            <h2 id="keep-reading" className="text-2xl md:text-3xl font-[500] text-white mb-8">
              Keep reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <BlogPostCard key={related.slug} post={related} headingLevel="h3" />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
