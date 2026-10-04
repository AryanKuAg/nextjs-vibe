import Image from "next/image";
import Link from "next/link";

import type { TemplatePage } from "@/lib/templates/catalog";

/** A template in the blog's card style, for the gallery, industry pages and related rows. */
export function TemplateCard({
  template,
  headingLevel: Heading = "h2",
}: {
  template: TemplatePage;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <article className="group flex flex-col bg-[#282828] rounded-[16px] overflow-hidden hover:ring-1 hover:ring-white/20 transition-all">
      <Link href={`/templates/${template.id}`} className="flex flex-col flex-1">
        <div className="relative aspect-[16/9] w-full bg-[#1a1a1a] overflow-hidden">
          <Image
            src={template.homescreenImgSrc}
            alt={`${template.title}, a ${template.category.toLowerCase()} website template`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            // Same reasoning as the homepage gallery: the covers are already
            // small WebPs on the CDN, and the optimizer would only add a hop.
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="p-6 flex flex-col flex-1">
          <p className="flex items-center text-xs text-[#8A8A88] mb-3 font-mono">{template.category}</p>
          <Heading className="text-xl text-white font-[500] mb-3 group-hover:text-primary transition-colors">
            {template.title}
          </Heading>
          <p className="text-sm text-[#CCCCCC] line-clamp-3 mb-4 flex-1">{template.summary}</p>
          <div className="flex items-center text-xs text-white font-mono mt-auto">
            View template &rarr;
          </div>
        </div>
      </Link>
    </article>
  );
}
