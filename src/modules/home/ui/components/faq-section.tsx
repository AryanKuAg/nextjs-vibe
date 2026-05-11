"use client";

import { useState } from "react";


/* ─── FAQ Data ──────────────────────────────────────────────────────── */
const faqs_list = [
  {
    q: "How does Framerate work?",
    a: "Framerate lets you turn a background image into a cinematic video, then uses that video's frames to create a smooth scrolling background on your website. As visitors scroll, the frames play forward, making the page feel like an interactive 3D experience.",
  },
  {
    q: "Do I need any design or coding experience?",
    a: "No, you don't need any design or coding experience to get started. Framerate is made so you can create and customize your site easily, even if you're a beginner.",
  },
  {
    q: "What can I create with Framerate?",
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
const FAQItem = ({ q, a, isOpen, onToggle }: FAQItem & { isOpen: boolean; onToggle: () => void }) => {
  return (
    <div className="rounded-[16px] overflow-hidden font-inconsolata border border-neutral-700  shadow-sm backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left text-sm text-white font-[400] bg-neutral-800 transition-colors "
      >
        <span className="text-sm leading-[20px]">{q}</span>
        <i className={`ri-arrow-down-s-line text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden"
        style={{ maxHeight: isOpen ? "500px" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="bg-neutral-800">
          <div className="mx-4 border-t border-white/10" />
          <div className="px-4 py-3 text-sm text-neutral-400 leading-[20px]">
            {a}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── FAQSection ─────────────────────────────────────────────────────── */
interface FAQSectionProps {
  faqs?: FAQItem[];
  title?: string;
}

export const FAQSection = ({ faqs = faqs_list, title = "Frequently asked questions" }: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-[40px] text-white text-center font-inconsolata font-[500] mb-4 leading-[40px]">
          {title}
        </h2>
        <p className="text-center font-mono text-[#8A8A88] text-sm">Got questions? We’ve got answers.</p>
      </div>
      <div className="flex flex-col gap-3">
        {faqs.map((faq, i) => (
          <FAQItem
            key={faq.q}
            q={faq.q}
            a={faq.a}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </>
  );
};
