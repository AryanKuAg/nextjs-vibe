import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { getAllPosts } from "@/lib/blog";
import { AGENT_COSTS } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbList, itemList } from "@/lib/structured-data";
import { getTemplatePage, templatesForUseCase } from "@/lib/templates/catalog";
import { USE_CASES, getUseCase } from "@/lib/use-cases";
import { Footer } from "@/modules/home/ui/components/footer";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { TemplateCard } from "@/modules/templates/ui/components/template-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return USE_CASES.map((useCase) => ({ slug: useCase.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return { title: "Not found" };

  const cover = getTemplatePage(useCase.coverTemplateId);

  return pageMetadata({
    title: useCase.metaTitle,
    description: useCase.description,
    path: `/use-cases/${useCase.slug}`,
    ...(cover ? { image: { url: cover.homescreenImgSrc, alt: useCase.heading } } : {}),
  });
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const cover = getTemplatePage(useCase.coverTemplateId);
  const templates = templatesForUseCase(useCase.slug, useCase.coverTemplateId);
  const posts = getAllPosts();
  const guides = useCase.guideSlugs.flatMap((guide) => posts.filter((post) => post.slug === guide));
  const others = USE_CASES.filter((other) => other.slug !== useCase.slug);
  const path = `/use-cases/${useCase.slug}`;

  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Use cases", path: "/use-cases" },
          { name: useCase.name, path },
        ])}
      />
      {templates.length > 0 && (
        <JsonLd
          data={itemList(
            `${useCase.name} website templates`,
            templates.map((template) => ({ name: template.title, path: `/templates/${template.id}` })),
          )}
        />
      )}

      <PillNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <Link href="/use-cases" className="inline-flex items-center text-[#8A8A88] hover:text-white mb-10 transition-colors font-mono text-sm">
          &larr; All use cases
        </Link>

        <article>
          <header className="mb-12">
            <h1 className="text-3xl md:text-5xl font-[500] text-white leading-tight mb-6">
              {useCase.heading}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-4 rounded-[12px] font-[500] text-sm hover:opacity-80 transition-opacity"
              >
                Start with a prompt
                <i aria-hidden className="ri-arrow-right-line text-base" />
              </Link>
              {templates.length > 0 && (
                <a
                  href="#templates"
                  className="inline-flex items-center px-6 py-4 rounded-[12px] border border-[#2A2A2A] text-white text-sm font-[500] hover:bg-white/10 transition-colors"
                >
                  See {useCase.name.toLowerCase()} templates
                </a>
              )}
            </div>
          </header>

          {cover && (
            <div className="relative aspect-[21/9] w-full bg-[#282828] rounded-[16px] overflow-hidden mb-12 border border-white/5">
              <Image
                src={cover.homescreenImgSrc}
                alt={`The ${cover.title} template, a ${cover.category.toLowerCase()} website built for Framerate`}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                unoptimized
                priority
                className="object-cover"
              />
            </div>
          )}

          <div className="prose prose-invert prose-lg max-w-none prose-headings:font-sans prose-p:font-sans prose-a:text-primary hover:prose-a:text-primary/80">
            {useCase.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}

            <h2>{useCase.benefitsHeading}</h2>
            {useCase.benefits.map((benefit) => (
              <section key={benefit.title}>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </section>
            ))}

            <h2>{useCase.sectionsHeading}</h2>
            <ul>
              {useCase.sections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>

            <h2>Start from a prompt like this</h2>
            <blockquote>
              <p>{useCase.examplePrompt}</p>
            </blockquote>
            <p>
              Paste it into the <Link href="/">builder on the homepage</Link>, change the details to match your
              business, and refine the result by chatting. Each prompt uses {AGENT_COSTS.CODE} credits.
            </p>
          </div>

          {templates.length > 0 && (
            <section aria-labelledby="templates" className="mt-16 scroll-mt-32">
              <h2 id="templates" className="text-2xl md:text-3xl font-[500] text-white mb-8">
                {useCase.name} templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((template) => (
                  <TemplateCard key={template.id} template={template} headingLevel="h3" />
                ))}
              </div>
            </section>
          )}

          <div className="prose prose-invert prose-lg max-w-none mt-16 prose-headings:font-sans prose-p:font-sans prose-a:text-primary hover:prose-a:text-primary/80">
            <h2>Questions</h2>
            {useCase.faq.map((item) => (
              <section key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </section>
            ))}

            {guides.length > 0 && (
              <>
                <h2>Further reading</h2>
                <ul>
                  {guides.map((post) => (
                    <li key={post.slug}>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2>Other industries</h2>
            <ul>
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/use-cases/${other.slug}`}>{other.heading}</Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
