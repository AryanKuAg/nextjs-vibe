import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbList, organizationNode } from "@/lib/structured-data";
import {
  CATALOG_UPDATED,
  TEMPLATE_PAGES,
  getTemplatePage,
  relatedTemplates,
} from "@/lib/templates/catalog";
import { getUseCase } from "@/lib/use-cases";
import { Footer } from "@/modules/home/ui/components/footer";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { TemplateCard } from "@/modules/templates/ui/components/template-card";
import { TemplateDownloadButton } from "@/modules/templates/ui/components/template-download-button";

interface Props {
  params: Promise<{ templateId: string }>;
}

/** "A, B and C" */
function joinList(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATE_PAGES.map((template) => ({ templateId: template.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { templateId } = await params;
  const template = getTemplatePage(templateId);
  if (!template) return { title: "Template not found" };

  return pageMetadata({
    title: template.seoTitle,
    description: template.summary,
    path: `/templates/${template.id}`,
    image: { url: template.homescreenImgSrc, alt: `${template.title} website template` },
  });
}

export default async function TemplatePage({ params }: Props) {
  const { templateId } = await params;
  const template = getTemplatePage(templateId);
  if (!template) notFound();

  const related = relatedTemplates(template);
  const useCases = template.useCases.flatMap((slug) => getUseCase(slug) ?? []);
  const path = `/templates/${template.id}`;
  const repoUrl = `https://github.com/${template.repo}`;

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: `${template.title} website template`,
          description: template.summary,
          url: absoluteUrl(path),
          image: template.homescreenImgSrc,
          codeRepository: repoUrl,
          programmingLanguage: template.framework === "next" ? "TypeScript" : "JavaScript",
          runtimePlatform: "Node.js",
          keywords: [template.seoTitle, template.category, ...template.stack].join(", "),
          isAccessibleForFree: true,
          dateModified: CATALOG_UPDATED,
          publisher: organizationNode(),
        }}
      />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Templates", path: "/templates" },
          { name: template.title, path },
        ])}
      />

      <PillNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <Link href="/templates" className="inline-flex items-center text-[#8A8A88] hover:text-white mb-10 transition-colors font-mono text-sm">
          &larr; All templates
        </Link>

        <article>
          <header className="mb-10">
            <h1 className="text-3xl md:text-5xl font-[500] text-white leading-tight mb-6">
              {template.title}: {template.seoTitle.toLowerCase()}
            </h1>
            <div className="flex flex-wrap items-center text-sm font-mono text-[#8A8A88] gap-4">
              <span>{template.category}</span>
              <span className="hidden sm:inline">•</span>
              <span>{template.stack[0]}</span>
              <span className="hidden sm:inline">•</span>
              <span>Free with a Framerate account</span>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-3 mb-10">
            <a
              href={template.demoUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-4 rounded-[12px] font-[500] text-sm hover:opacity-80 transition-opacity"
            >
              Open live demo
              <i aria-hidden className="ri-arrow-right-up-line text-base" />
            </a>
            <TemplateDownloadButton templateId={template.id} />
          </div>

          <div className="relative aspect-[16/9] w-full bg-[#282828] rounded-[16px] overflow-hidden mb-12 border border-white/5">
            <Image
              src={template.homescreenImgSrc}
              alt={`${template.title} website template: the ${template.brand} homepage`}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              unoptimized
              priority
              className="object-cover"
            />
          </div>

          <div className="prose prose-invert prose-lg max-w-none prose-headings:font-sans prose-p:font-sans prose-a:text-primary hover:prose-a:text-primary/80">
            {template.overview.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}

            <h2>What&rsquo;s on the page</h2>
            <ul>
              {template.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>

            <h2>Who it&rsquo;s for</h2>
            <ul>
              {template.bestFor.map((audience) => (
                <li key={audience}>{audience}</li>
              ))}
            </ul>

            <h2>Built with</h2>
            <p>
              The download is the template&rsquo;s complete source code, taken from its public repository,{" "}
              <a href={repoUrl} target="_blank" rel="noopener">
                {template.repo}
              </a>
              . It uses {joinList(template.stack)}
              {template.scrollVideo
                ? ", which ties the background film to the scroll position."
                : "."}
            </p>

            <h2>Make it yours</h2>
            <p>
              Edit the downloaded code like any {template.framework === "next" ? "Next.js" : "Vite"} project:
              swap in your own film, copy and colors, then deploy it anywhere. Rather not touch code? Describe
              your own business on <Link href="/">Framerate</Link> and its AI will build a new site from your
              words instead.
            </p>

            {useCases.length > 0 && (
              <>
                <h2>Use cases</h2>
                <ul>
                  {useCases.map((useCase) => (
                    <li key={useCase.slug}>
                      <Link href={`/use-cases/${useCase.slug}`}>{useCase.heading}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="more-templates" className="mt-20">
            <h2 id="more-templates" className="text-2xl md:text-3xl font-[500] text-white mb-8">
              More templates like this
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((other) => (
                <TemplateCard key={other.id} template={other} headingLevel="h3" />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
