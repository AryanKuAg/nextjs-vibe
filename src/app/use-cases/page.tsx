import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbList, itemList } from "@/lib/structured-data";
import { getTemplatePage } from "@/lib/templates/catalog";
import { USE_CASES } from "@/lib/use-cases";
import { Footer } from "@/modules/home/ui/components/footer";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";

export const metadata: Metadata = pageMetadata({
  title: "AI Website Builder Use Cases",
  description:
    "How real estate teams, hotels, architects, interior designers and creatives use Framerate to build cinematic websites from a prompt.",
  path: "/use-cases",
});

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col font-sans">
      <JsonLd
        data={itemList(
          "Framerate use cases",
          USE_CASES.map((useCase) => ({ name: useCase.heading, path: `/use-cases/${useCase.slug}` })),
        )}
      />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Use cases", path: "/use-cases" },
        ])}
      />
      <PillNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-32 pb-20">
        <header className="flex flex-col items-center mb-16">
          <h1 className="text-4xl md:text-5xl font-mono text-center text-white leading-[1] font-[500] mb-4">
            What you can build
          </h1>
          <p className="text-center font-mono text-[#8A8A88] text-lg max-w-2xl">
            Cinematic websites for businesses that sell on atmosphere, built from a written brief.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((useCase) => {
            const cover = getTemplatePage(useCase.coverTemplateId);
            return (
              <article
                key={useCase.slug}
                className="group flex flex-col bg-[#282828] rounded-[16px] overflow-hidden hover:ring-1 hover:ring-white/20 transition-all"
              >
                <Link href={`/use-cases/${useCase.slug}`} className="flex flex-col flex-1">
                  <div className="relative aspect-[16/9] w-full bg-[#1a1a1a] overflow-hidden">
                    {cover && (
                      <Image
                        src={cover.homescreenImgSrc}
                        alt={`A ${useCase.name.toLowerCase()} website built with Framerate`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-xl text-white font-[500] mb-3 group-hover:text-primary transition-colors">
                      {useCase.name}
                    </h2>
                    <p className="text-sm text-[#CCCCCC] line-clamp-3 mb-4 flex-1">{useCase.summary}</p>
                    <div className="flex items-center text-xs text-white font-mono mt-auto">
                      Explore &rarr;
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
