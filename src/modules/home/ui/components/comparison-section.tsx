"use client";

import Image from "next/image";

/* ─── ComparisonSection ──────────────────────────────────────────────────
   Comparison table + stat pills placed between PricingSection and FAQSection
   on the /pricing page. Matches the Framerate dark design system.
──────────────────────────────────────────────────────────────────────── */

const rows = [
  {
    label: "Cost",
    agency: { main: "$5k – $25k", sub: "Plus revision fees" },
    us: { main: "$39 / month", sub: "Iterate anytime" },
  },
  {
    label: "Time to live",
    agency: { main: "4 – 8 weeks", sub: "Briefs, calls, handoffs" },
    us: { main: "Under 10 mins", sub: "Prompt. Preview. Ship." },
  },
  {
    label: "Changes",
    agency: { main: "$150–300 / hr", sub: "Every tweak costs" },
    us: { main: "Instant edits", sub: "Just type changes" },
  },
  {
    label: "3D scroll",
    agency: { main: "Expensive custom work", sub: "Complex dev setup" },
    us: { main: "Built in", sub: "Ready instantly" },
  },
  {
    label: "You own it",
    agency: { main: "Often platform locked", sub: "Depends on the stack" },
    us: { main: "Full export access", sub: "Export anytime" },
  },
];

const stats = [
  { value: "99%", label: "Cheaper" },
  { value: "100x", label: "Faster" },
  { value: "0", label: "Zoom calls" },
];

export const ComparisonSection = () => {
  return (
    <section className="py-[60px] md:py-24 px-4 sm:px-6 max-w-[640px] mx-auto w-full font-onest font-[500]">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-3xl text-[40px] md:text-5xl text-white font-[700] leading-[1.1] mb-5 md:whitespace-nowrap font-stack-sans-notch">
          Agencies take weeks.<br />
          Framerate ships in minutes.
        </h2>
        <p className="text-sm text-[#737373] max-w-lg">
          Agencies overbill. Freelancers overrun timelines. Framerate just builds.
        </p>
      </div>

      {/* Comparison table */}
      <div className="rounded-[24px] overflow-hidden   bg-gradient-to-b from-[#282828] to-[#282828]/40">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr] ">
          <div className="px-5 py-3" />
          <div className="p-6 text-xs text-[#8A8A88] flex items-center">
            <span>Freelancer / Agency</span>
          </div>
          <div className="p-6 flex items-center gap-2">
            {/* Framerate brand cell */}
            <Image src="/framerate_logo_long.png" alt="framerate" width={259} height={60} className="h-4 w-auto object-contain scale-125" />
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_1fr_1fr] text-sm`}
          >
            {/* Label */}
            <div className="p-6 text-sm text-[#8A8A88] flex items-center">
              {row.label}
            </div>

            {/* Agency column */}
            <div className="p-6">
              <p className="text-sm text-[#fff]">{row.agency.main}</p>
              <p className="text-xs text-[#737373] mt-1">{row.agency.sub}</p>
            </div>

            {/* Framerate column */}
            <div className="p-6">
              <p className="text-sm text-white font-[500]">{row.us.main}</p>
              <p className="text-xs text-[#737373] mt-1">{row.us.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer tagline */}
      <div className="mt-10 flex flex-col items-center text-center gap-2">
        <p className="text-sm text-white">
          One month of Framerate costs less than a single revision round.
        </p>
        <p className="text-sm text-[#737373]">
          No briefs. No waiting. Just describe your site and watch it appear.
        </p>
      </div>
    </section>
  );
};
