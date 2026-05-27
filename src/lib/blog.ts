import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const contentDir = path.join(process.cwd(), "src/content/blog");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  keywords?: string[];
  coverImage?: string;
  content: string;
  author: string;
  readTime: string;
}

export function getAllPosts(): Omit<BlogPost, "content">[] {
  if (!fs.existsSync(contentDir)) {
    return [];
  }
  
  const files = fs.readdirSync(contentDir);
  const posts = files
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const fullPath = path.join(contentDir, filename);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      
      const { data } = matter(fileContents);
      
      return {
        slug,
        title: data.title || "Untitled",
        date: data.date || "",
        excerpt: data.excerpt || "",
        keywords: data.keywords || [],
        coverImage: data.coverImage || "",
        author: data.author || "Framerate Team",
        readTime: data.readTime || "5 min read",
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
    
  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(contentDir, `${slug}.md`);
    if (!fs.existsSync(fullPath)) return null;

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    const processedContent = await remark()
      .use(html)
      .process(content);
      
    const contentHtml = processedContent.toString();

    return {
      slug,
      title: data.title || "Untitled",
      date: data.date || "",
      excerpt: data.excerpt || "",
      keywords: data.keywords || [],
      coverImage: data.coverImage || "",
      author: data.author || "Framerate Team",
      readTime: data.readTime || "5 min read",
      content: contentHtml,
    };
  } catch (error) {
    console.error(`Error loading post: ${slug}`, error);
    return null;
  }
}
