import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbList, itemList } from "@/lib/structured-data";
import { TEMPLATE_PAGES } from "@/lib/templates/catalog";
import { USE_CASES } from "@/lib/use-cases";
import { Footer } from "@/modules/home/ui/components/footer";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { TemplateCard } from "@/modules/templates/ui/components/template-card";

const DESCRIPTION = `${TEMPLATE_PAGES.length} cinematic, scroll-driven website templates for real estate, hotels, architecture and interiors. Preview them live and download the code free.`;

export const metadata: Metadata = pageMetadata({
  title: "Free 3D Website Templates",
  description: DESCRIPTION,
  path: "/templates",
  image: { url: TEMPLATE_PAGES[0].homescreenImgSrc, alt: "Framerate website templates" },
});

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd
        data={itemList(
          "Framerate website templates",
          TEMPLATE_PAGES.map((template) => ({ name: template.title, path: `/templates/${template.id}` })),
        )}
      />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Templates", path: "/templates" },
        ])}
      />
      <PillNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <header className="flex flex-col items-center mb-16">
          <h1 className="text-4xl md:text-5xl font-mono text-center text-white leading-[1] font-[500] mb-4">
            3D Website Templates
          </h1>
          <p className="text-center font-mono text-[#8A8A88] text-lg max-w-2xl">
            {TEMPLATE_PAGES.length} cinematic, scroll-driven sites, hand-built and free to download with a
            Framerate account. Preview each one live, then take the code.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATE_PAGES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        <section aria-labelledby="by-industry" className="mt-24">
          <h2 id="by-industry" className="text-2xl md:text-3xl font-[500] text-white mb-8">
            Browse by industry
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {USE_CASES.map((useCase) => (
              <li key={useCase.slug}>
                <Link
                  href={`/use-cases/${useCase.slug}`}
                  className="flex h-full flex-col rounded-[16px] bg-[#282828] p-6 hover:ring-1 hover:ring-white/20 transition-all"
                >
                  <span className="text-xl text-white font-[500] mb-2">{useCase.name}</span>
                  <span className="text-sm text-[#CCCCCC]">{useCase.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
