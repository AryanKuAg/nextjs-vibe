import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const contentDir = path.join(process.cwd(), "src/content/blog");

/** Words a minute an adult reads on screen: the basis for "N min read". */
const READING_SPEED_WPM = 230;

export interface BlogPost {
  slug: string;
  title: string;
  /** First published, yyyy-mm-dd. */
  date: string;
  /**
   * Last substantive revision, from the `updated` frontmatter field. Equal to
   * `date` for a post that hasn't been revised: bumping it for a typo would
   * tell search engines the article changed when it didn't.
   */
  updated: string;
  excerpt: string;
  keywords: string[];
  coverImage?: string;
  content: string;
  author: string;
  readTime: string;
  wordCount: number;
}

export type BlogPostSummary = Omit<BlogPost, "content">;

/**
 * Counted from the article itself rather than trusted from frontmatter, where
 * a 1,300-word post had been labelled "21 min read".
 */
function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/[#>*_`[\]()!|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function summarize(slug: string, data: Record<string, unknown>, markdown: string): BlogPostSummary {
  const wordCount = countWords(markdown);
  const date = typeof data.date === "string" ? data.date : "";

  return {
    slug,
    title: typeof data.title === "string" ? data.title : "Untitled",
    date,
    updated: typeof data.updated === "string" ? data.updated : date,
    excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    coverImage: typeof data.coverImage === "string" ? data.coverImage : "",
    author: typeof data.author === "string" ? data.author : "Framerate Team",
    readTime: `${Math.max(1, Math.round(wordCount / READING_SPEED_WPM))} min read`,
    wordCount,
  };
}

export function getAllPosts(): BlogPostSummary[] {
  if (!fs.existsSync(contentDir)) {
    return [];
  }

  return fs
    .readdirSync(contentDir)
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const { data, content } = matter(fs.readFileSync(path.join(contentDir, filename), "utf8"));
      return summarize(slug, data, content);
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

function slugify(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Gives every h2 and h3 an id, so a section can be linked to directly and
 * shown as a jump link in search results. Done on the sanitized output because
 * the sanitizer would otherwise rename ids to "user-content-…"; remark's own
 * headings carry no attributes, so the pattern is exact.
 */
function withHeadingIds(markup: string): string {
  const seen = new Map<string, number>();

  return markup.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level: string, inner: string) => {
    const base = slugify(inner) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return `<h${level} id="${count ? `${base}-${count}` : base}">${inner}</h${level}>`;
  });
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(contentDir, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const { data, content } = matter(fs.readFileSync(fullPath, "utf8"));
    const processedContent = await remark().use(html).process(content);

    return {
      ...summarize(slug, data, content),
      content: withHeadingIds(processedContent.toString()),
    };
  } catch (error) {
    console.error(`Error loading post: ${slug}`, error);
    return null;
  }
}

const STOP_WORDS = new Set(
  "a an and are as at be best by can for from guide how in into is it its of on or the to vs what why with your you framerate".split(" "),
);

function termsOf(post: BlogPostSummary): string[] {
  const text = [post.title, post.slug.replace(/-/g, " "), ...post.keywords].join(" ").toLowerCase();
  const terms = text
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term))
    .map((term) => (term.length > 3 && term.endsWith("s") ? term.slice(0, -1) : term));
  return [...new Set(terms)];
}

/**
 * The posts closest to this one in topic: shared title, slug and keyword terms,
 * each weighted by how rare it is across the blog, so that "webgl" counts for
 * far more than "3d", which half the posts mention.
 */
export function getRelatedPosts(slug: string, limit = 3): BlogPostSummary[] {
  const posts = getAllPosts();
  const current = posts.find((post) => post.slug === slug);
  if (!current) return [];

  const termSets = new Map(posts.map((post) => [post.slug, termsOf(post)]));
  const documentFrequency = new Map<string, number>();
  for (const terms of termSets.values()) {
    for (const term of terms) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }

  const currentTerms = termSets.get(slug) ?? [];

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const shared = (termSets.get(post.slug) ?? []).filter((term) => currentTerms.includes(term));
      const score = shared.reduce(
        (sum, term) => sum + Math.log(posts.length / (documentFrequency.get(term) ?? 1)),
        0,
      );
      return { post, score };
    })
    .sort((a, b) => b.score - a.score || (a.post.date > b.post.date ? -1 : 1))
    .slice(0, limit)
    .map(({ post }) => post);
}
