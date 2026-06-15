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
    <div className="rounded-[24px] overflow-hidden font-onest bg-gradient-to-b from-[#282828] to-[#282828]/40">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left text-[16px] text-white font-[500] bg-transparent transition-colors"
      >
        <span className="leading-[24px]">{q}</span>
        <i className={`ri-arrow-down-s-line text-white text-xl transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? "500px" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="bg-transparent">
          <div className="px-6 pb-6 text-[14px] text-[#737373] font-[500] leading-[1.6]">
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
        <h2 className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">
          {title}
        </h2>
        <p className="text-center font-onest text-[#737373] text-sm font-[500]">
          Got questions? We've got answers.
        </p>
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
