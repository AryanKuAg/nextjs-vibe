import Link from "next/link";

import { getAllPosts } from "@/lib/blog";
import { AGENT_COSTS, PLANS } from "@/lib/pricing";
import { CONTACT_EMAIL } from "@/lib/site";
import { TEMPLATE_PAGES } from "@/lib/templates/catalog";
import { USE_CASES } from "@/lib/use-cases";

/**
 * The signed-out homepage's crawlable content: what Framerate is, how it
 * works, what it builds, common questions, and links into the rest of the site.
 * A server component handed to the client view as a prop, so it costs no
 * JavaScript, and it sits under the template grid so nothing above it moves.
 */

const STEPS = [
  {
    title: "Describe it",
    body: "Say what the site is for, who it's for and how it should feel. Attach a reference image if you have one.",
  },
  {
    title: "Watch it build",
    body: "Framerate's AI plans the layout, type and motion, then builds a working site you can preview live.",
  },
  {
    title: "Refine and launch",
    body: "Ask for changes in plain words. Publish to a live link when it's ready, or download the code and host it anywhere.",
  },
];

const GUIDE_SLUGS = [
  "how-to-build-a-3d-website",
  "how-much-does-a-3d-website-cost",
  "ai-3d-website-builder",
  "framerate-vs-framer-comparison",
  "framerate-vs-webflow-comparison",
  "how-to-create-a-3d-portfolio-website",
];

const FOOTER_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/templates", label: "Templates" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/compliance", label: "Compliance" },
];

function pricingAnswer(): string {
  const [first, ...rest] = PLANS.map(
    (plan) => `${plan.title} at $${plan.monthlyPrice} for ${plan.features[0]}`,
  );
  const yearly = PLANS.map((plan) => `$${plan.yearlyPrice}`);
  return (
    `There are ${PLANS.length} plans, billed monthly: ${first}, ${rest.slice(0, -1).join(", ")} and ${rest.at(-1)}. ` +
    `Paying yearly brings them down to ${yearly.slice(0, -1).join(", ")} and ${yearly.at(-1)} a month. ` +
    `Each prompt to the site builder uses ${AGENT_COSTS.CODE} credits.`
  );
}

export function HomeMarketing() {
  const templateCount = TEMPLATE_PAGES.length;
  const posts = getAllPosts();
  const guides = GUIDE_SLUGS.flatMap((slug) => posts.filter((post) => post.slug === slug));

  const faq = [
    {
      question: "Do I need to know how to code?",
      answer:
        "No. You describe the site in plain language and change it the same way. The code is there when you want it: every plan includes full site export.",
    },
    {
      question: "How much does Framerate cost?",
      answer: pricingAnswer(),
    },
    {
      question: "What kinds of websites can I build?",
      answer: `Sites where atmosphere matters: property launches and listings, hotels and resorts, architecture and interior studios, portfolios, and product or event launches. Start from a description, or download one of ${templateCount} templates and adapt it.`,
    },
    {
      question: "Can I export the code?",
      answer:
        "Yes. Download your site's code and host it wherever you like, or publish it straight from Framerate. The templates download as complete Next.js or Vite projects too.",
    },
    {
      question: "Who owns the websites I make?",
      answer:
        "You keep ownership of what you create. Framerate's terms give it only a limited license to host, process and display your content in order to provide and improve the service.",
    },
    {
      question: "What does “3D website” mean here?",
      answer:
        "A site with real depth and motion, such as scroll-scrubbed film, layered scenes and cinematic transitions, rather than a flat stack of sections. You don't need to know 3D modelling or WebGL to make one.",
    },
  ];

  return (
    <div className="mt-16 md:mt-24 pb-6 font-onest flex flex-col gap-16 md:gap-24">
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-white text-[24px] leading-[32px] font-semibold">
          How Framerate works
        </h2>
        <p className="mt-3 max-w-[640px] text-base leading-[24px] text-white-50">
          Framerate is an AI website builder for cinematic, 3D websites. Describe the site you want in a
          sentence or two, and it designs and codes a complete, responsive site with motion built in. Refine
          it by chatting, then publish it to a live link or download the code.
        </p>
        <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-[12px] border border-white-8 p-5">
              <span className="text-[13px] leading-[20px] text-white-50">0{index + 1}</span>
              <h3 className="mt-6 text-base leading-[24px] font-medium text-white-85">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-[20px] text-white-50">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="what-you-can-build">
        <h2 id="what-you-can-build" className="text-white text-[24px] leading-[32px] font-semibold">
          What you can build
        </h2>
        <p className="mt-3 max-w-[640px] text-base leading-[24px] text-white-50">
          Start from a prompt, or from one of {templateCount} hand-built templates.
        </p>
        <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {USE_CASES.map((useCase) => (
            <li key={useCase.slug}>
              <Link
                href={`/use-cases/${useCase.slug}`}
                className="group flex h-full flex-col rounded-[12px] border border-white-8 p-5 hover:bg-white-4 transition-colors"
              >
                <span className="flex items-center justify-between text-base leading-[24px] font-medium text-white-85">
                  {useCase.name}
                  <i aria-hidden className="ri-arrow-right-up-line text-white-50 group-hover:text-white-85 transition-colors" />
                </span>
                <span className="mt-1.5 text-sm leading-[20px] text-white-50">{useCase.summary}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/templates"
              className="group flex h-full flex-col rounded-[12px] border border-white-8 p-5 hover:bg-white-4 transition-colors"
            >
              <span className="flex items-center justify-between text-base leading-[24px] font-medium text-white-85">
                All {templateCount} templates
                <i aria-hidden className="ri-arrow-right-up-line text-white-50 group-hover:text-white-85 transition-colors" />
              </span>
              <span className="mt-1.5 text-sm leading-[20px] text-white-50">
                Preview each one live and download its code.
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="questions">
        <h2 id="questions" className="text-white text-[24px] leading-[32px] font-semibold">
          Questions
        </h2>
        <div className="mt-8 border-t border-white-8">
          {faq.map((item) => (
            <details key={item.question} className="group border-b border-white-8 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base leading-[24px] font-medium text-white-85 [&::-webkit-details-marker]:hidden">
                <h3>{item.question}</h3>
                <i aria-hidden className="ri-add-line shrink-0 text-white-50 transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-2 max-w-[640px] text-sm leading-[20px] text-white-50">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {guides.length > 0 && (
        <section aria-labelledby="guides">
          <h2 id="guides" className="text-white text-[24px] leading-[32px] font-semibold">
            Guides
          </h2>
          <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 border-t border-white-8">
            {guides.map((post) => (
              <li key={post.slug} className="border-b border-white-8">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex items-center justify-between gap-4 py-4 text-sm leading-[20px] text-white-85 hover:text-white transition-colors"
                >
                  {post.title}
                  <i aria-hidden className="ri-arrow-right-line shrink-0 text-white-50 group-hover:text-white-85 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/blog"
            className="mt-6 inline-flex h-[28px] items-center rounded-[8px] border-[0.5px] border-white-12 px-2 text-[14px] leading-[20px] font-medium text-white-85 hover:bg-white-8 transition-colors"
          >
            All articles
          </Link>
        </section>
      )}

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white-8 pt-6 text-[13px] leading-[20px] text-white-50">
        <span>© {new Date().getFullYear()} Framerate</span>
        <nav aria-label="Site" className="contents">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white-85 transition-colors">
              {link.label}
            </Link>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white-85 transition-colors">
            Contact
          </a>
        </nav>
      </footer>
    </div>
  );
}
