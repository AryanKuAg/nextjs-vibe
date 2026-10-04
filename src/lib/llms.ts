import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { getAllPosts } from "@/lib/blog";
import { AGENT_COSTS, PLANS } from "@/lib/pricing";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";
import { TEMPLATE_PAGES } from "@/lib/templates/catalog";
import { USE_CASES } from "@/lib/use-cases";

/**
 * Plain-text descriptions of Framerate for AI assistants and agents: llms.txt
 * (llmstxt.org), its long form llms-full.txt, and pricing.md. Built from the
 * same data as the pages, so they can't drift from what the site says.
 */

const COMPARISON_PREFIX = "framerate-vs-";

/** Features every plan shares, and the ones that tell plans apart. */
function planFacts() {
  const shared = PLANS[0].features.filter((feature) =>
    PLANS.every((plan) => plan.features.includes(feature)),
  );
  const rows = PLANS.map((plan) => {
    const find = (pattern: RegExp) => plan.features.find((feature) => pattern.test(feature)) ?? "";
    return {
      title: plan.title,
      monthly: plan.monthlyPrice,
      yearly: plan.yearlyPrice,
      credits: find(/credits/i).replace(/\s*credits/i, ""),
      models: find(/AI models/i).replace(/\s*AI models/i, ""),
      generation: find(/generation/i).replace(/\s*generation/i, ""),
    };
  });
  return { shared, rows };
}

function keyFacts(): string {
  const { rows } = planFacts();
  const prices = rows.map((row) => `${row.title} $${row.monthly}/month (${row.credits} credits)`).join(", ");

  return [
    `- What it is: an AI website builder. Describe a site in plain language, optionally with a reference image, and the AI designs and codes a complete, responsive website with motion built in.`,
    `- Editing: refine the site by chatting. Each prompt to the builder, the first build or a follow-up change, uses ${AGENT_COSTS.CODE} credits.`,
    `- Output: preview the site live, publish it to a live link, or download its code (full site export is included in every plan).`,
    `- Pricing: ${prices}. Yearly billing costs ${rows.map((row) => `$${row.yearly}`).join(", ")} per month respectively. Creating an account is free; building with AI requires a paid plan. Credits refresh monthly and do not roll over.`,
    `- Templates: ${TEMPLATE_PAGES.length} hand-built, scroll-driven website templates (Next.js or Vite projects), free to preview and to download with an account.`,
    `- Ownership: under Framerate's terms, users keep ownership of the content they create.`,
    `- Best for: ${USE_CASES.map((useCase) => useCase.name.toLowerCase()).join(", ")}, and launches where atmosphere matters.`,
    `- Contact: ${CONTACT_EMAIL}`,
  ].join("\n");
}

export function llmsTxt(): string {
  const posts = getAllPosts();
  const comparisons = posts.filter((post) => post.slug.startsWith(COMPARISON_PREFIX));
  const guides = posts.filter((post) => !post.slug.startsWith(COMPARISON_PREFIX));
  const link = (title: string, pathname: string, note?: string) =>
    `- [${title}](${absoluteUrl(pathname)})${note ? `: ${note}` : ""}`;

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    keyFacts(),
    "",
    "## Product",
    "",
    link("Homepage", "/", "What Framerate is, how it works, pricing and common questions."),
    link("Pricing", "/pricing.md", "Plans, prices and credit costs in Markdown."),
    link("Templates", "/templates", `All ${TEMPLATE_PAGES.length} templates with live demos and downloads.`),
    link("Use cases", "/use-cases", "The industries Framerate is built for."),
    link("Full text for language models", "/llms-full.txt", "Everything below, with each page's content inline."),
    "",
    "## Use cases",
    "",
    ...USE_CASES.map((useCase) => link(useCase.heading, `/use-cases/${useCase.slug}`, useCase.summary)),
    "",
    "## Templates",
    "",
    ...TEMPLATE_PAGES.map((template) =>
      link(`${template.title} (${template.seoTitle.toLowerCase()})`, `/templates/${template.id}`, template.summary),
    ),
    "",
    "## Comparisons",
    "",
    ...comparisons.map((post) => link(post.title, `/blog/${post.slug}`, post.excerpt)),
    "",
    "## Guides",
    "",
    ...guides.map((post) => link(post.title, `/blog/${post.slug}`, post.excerpt)),
    "",
    "## Optional",
    "",
    link("Terms of Service", "/terms"),
    link("Privacy Policy", "/privacy"),
    link("Cookie Policy", "/cookies"),
    link("Compliance", "/compliance"),
    "",
  ].join("\n");
}

export function pricingMd(): string {
  const { shared, rows } = planFacts();

  return [
    `# ${SITE_NAME} pricing`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Prices are in US dollars. Creating an account is free, and includes previewing and downloading templates. Building and editing sites with AI uses credits, which come with a paid plan.",
    "",
    "| Plan | Billed monthly | Billed yearly (per month) | Credits per month | AI models | Generation |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.title} | $${row.monthly} | $${row.yearly} | ${row.credits} | ${row.models} | ${row.generation} |`,
    ),
    "",
    `Every plan includes: ${shared.map((feature) => feature.toLowerCase()).join(", ")}.`,
    "",
    "## How credits work",
    "",
    `- Each prompt to the site builder uses ${AGENT_COSTS.CODE} credits. That covers the first build and every follow-up change.`,
    "- Credits refresh each month while a subscription is active. Unused credits do not roll over.",
    `- Plans are listed on ${absoluteUrl("/")} in the pricing dialog. Questions: ${CONTACT_EMAIL}.`,
    "",
  ].join("\n");
}

const contentDir = path.join(process.cwd(), "src/content/blog");

function postMarkdown(slug: string): string {
  const file = path.join(contentDir, `${slug}.md`);
  return fs.existsSync(file) ? matter(fs.readFileSync(file, "utf8")).content.trim() : "";
}

export function llmsFullTxt(): string {
  const posts = getAllPosts();

  const useCases = USE_CASES.map((useCase) =>
    [
      `## ${useCase.heading}`,
      "",
      `URL: ${absoluteUrl(`/use-cases/${useCase.slug}`)}`,
      "",
      ...useCase.intro.flatMap((paragraph) => [paragraph, ""]),
      ...useCase.benefits.map((benefit) => `- ${benefit.title}: ${benefit.body}`),
      "",
      ...useCase.faq.flatMap((item) => [`Q: ${item.question}`, `A: ${item.answer}`, ""]),
    ].join("\n"),
  );

  const templates = TEMPLATE_PAGES.map((template) =>
    [
      `## ${template.title}: ${template.seoTitle.toLowerCase()}`,
      "",
      `URL: ${absoluteUrl(`/templates/${template.id}`)}`,
      `Live demo: ${template.demoUrl}`,
      `Source: https://github.com/${template.repo}`,
      `Built with: ${template.stack.join(", ")}`,
      "",
      ...template.overview.flatMap((paragraph) => [paragraph, ""]),
      ...template.sections.map((section) => `- ${section}`),
      "",
      `Best for: ${template.bestFor.join("; ")}.`,
      "",
    ].join("\n"),
  );

  const articles = posts.map((post) =>
    [
      `## ${post.title}`,
      "",
      `URL: ${absoluteUrl(`/blog/${post.slug}`)}`,
      `Published: ${post.date}${post.updated !== post.date ? ` (updated ${post.updated})` : ""}`,
      "",
      postMarkdown(post.slug),
      "",
    ].join("\n"),
  );

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    keyFacts(),
    "",
    pricingMd().replace(/^# .*\n\n> .*\n\n/, "## Pricing\n\n"),
    "# Use cases",
    "",
    ...useCases,
    "# Templates",
    "",
    ...templates,
    "# Blog",
    "",
    ...articles,
  ].join("\n");
}
