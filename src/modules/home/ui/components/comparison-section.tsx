"use client";

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
    <section className="py-[60px] md:py-24 px-6 max-w-4xl mx-auto w-full font-inconsolata">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12">
        <p className="text-xs tracking-[0.18em] uppercase text-[#8A8A88] mb-4">
          Why Framerate?
        </p>
        <h2 className="text-3xl md:text-5xl text-white font-[500] leading-[1.1] mb-5">
          Agencies take weeks.<br />
          Framerate ships in minutes.
        </h2>
        <p className="text-sm text-[#8A8A88] max-w-lg">
          Agencies overbill. Freelancers overrun timelines. Framerate just builds.
        </p>
      </div>

      {/* Comparison table */}
      <div className="rounded-[16px] overflow-hidden border border-white/[0.06] bg-[#1c1c1c]">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-white/[0.06]">
          <div className="px-5 py-3" />
          <div className="px-5 py-3 text-xs text-[#8A8A88] border-l border-white/[0.06]">
            Freelancer / Agency
          </div>
          <div className="px-5 py-3 border-l border-white/[0.06] flex items-center gap-2">
            {/* Framerate brand cell */}
            <span className="text-base">✳️</span>
            <span className="text-sm text-white font-[500]">framerate</span>
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-[1fr_1fr_1fr] ${i !== rows.length - 1 ? "border-b border-white/[0.06]" : ""}`}
          >
            {/* Label */}
            <div className="px-5 py-4 text-sm text-[#8A8A88] flex items-center">
              {row.label}
            </div>

            {/* Agency column */}
            <div className="px-5 py-4 border-l border-white/[0.06]">
              <p className="text-sm text-[#CCCCCC]">{row.agency.main}</p>
              <p className="text-xs text-[#666666] mt-0.5">{row.agency.sub}</p>
            </div>

            {/* Framerate column — slightly highlighted */}
            <div className="px-5 py-4 border-l border-white/[0.06] bg-white/[0.03]">
              <p className="text-sm text-white font-[500]">{row.us.main}</p>
              <p className="text-xs text-[#666666] mt-0.5">{row.us.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[12px] bg-[#1c1c1c] border border-white/[0.06] flex flex-col items-center justify-center py-7 gap-1"
          >
            <span className="text-4xl md:text-5xl text-white font-[500]">{s.value}</span>
            <span className="text-xs text-[#8A8A88]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Footer tagline */}
      <div className="mt-10 flex flex-col items-center text-center gap-1">
        <p className="text-sm text-[#CCCCCC]">
          One month of Framerate costs less than a single revision round.
        </p>
        <p className="text-xs text-[#666666]">
          No briefs. No waiting. Just describe your site and watch it appear.
        </p>
      </div>
    </section>
  );
};
