import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";

interface Props {
  params: Promise<{ slug: string }>;
}

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

  return {
    title: `${post.title} – Framerate`,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url: `https://framerate.space/blog/${slug}`,
      images: post.coverImage ? [post.coverImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.coverImage ? [`https://framerate.space${post.coverImage}`] : [],
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Organization",
      "name": post.author,
    },
    "publisher": {
      "@type": "Organization",
      "name": "Framerate",
      "logo": {
        "@type": "ImageObject",
        "url": "https://framerate.space/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://framerate.space/blog/${slug}`
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://framerate.space"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://framerate.space/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://framerate.space/blog/${slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </time>
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
      </main>

      <Footer />
    </div>
  );
}
