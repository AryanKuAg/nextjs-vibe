"use client";

import { useState } from "react";


/* ─── FAQ Data ──────────────────────────────────────────────────────── */
const faqs_list = [
  {
    q: "How does Spatial work?",
    a: "Spatial lets you turn a background image into a cinematic video, then uses that video's frames to create a smooth scrolling background on your website. As visitors scroll, the frames play forward, making the page feel like an interactive 3D experience.",
  },
  {
    q: "Do I need any design or coding experience?",
    a: "No, you don't need any design or coding experience to get started. Spatial is made so you can create and customize your site easily, even if you're a beginner.",
  },
  {
    q: "What can I create with Spatial?",
    a: "You can create 3D websites, interactive pages, and immersive visuals for products, portfolios, events, or brand experiences.",
  },
  {
    q: "How do credits work, and what do they cover?",
    a: "If you run out of credits, you won't be able to create more until your credits refresh on your next billing date. You can also upgrade to a higher plan if you need more credits sooner.",
  },
  {
    q: "Can I use the generated content commercially?",
    a: "Yes, you can use the generated content commercially.",
  },
];

/* ─── Types ──────────────────────────────────────────────────────────── */
export interface FAQItem {
  q: string;
  a: string;
}

/* ─── FAQItem ────────────────────────────────────────────────────────── */
const FAQItem = ({ q, a }: FAQItem) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[8px] overflow-hidden font-inconsolata">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm text-white font-[500] bg-[#272725] transition-colors"
      >
        <span>{q}</span>
        <i className={`ri-arrow-down-s-line text-white transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="bg-[#272725]">
          {/* This div acts as the 16px padded border */}
          <div className="mx-4 border-t border-white/5" />

          <div className="px-4 py-3 text-sm text-[#999999] leading-relaxed">
            {a}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── FAQSection ─────────────────────────────────────────────────────── */
interface FAQSectionProps {
  faqs?: FAQItem[];
  title?: string;
}

export const FAQSection = ({ faqs = faqs_list, title = "Frequently asked questions" }: FAQSectionProps) => {
  return (
    <>
      <h2 className="text-[40px] text-white text-center font-inconsolata font-[500] mb-10">
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {faqs.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </>
  );
};
