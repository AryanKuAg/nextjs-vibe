"use client";

import "remixicon/fonts/remixicon.css";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { PricingSection } from "@/modules/home/ui/components/pricing-section";
import { FAQSection } from "@/modules/home/ui/components/faq-section";
import { FinalCTASection } from "@/modules/home/ui/components/final-cta-section";
import { ComparisonSection } from "@/modules/home/ui/components/comparison-section";


/* ─── Page ─────────────────────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-white">
      <PillNavbar />

      {/* Hero */}
      <section className="pt-40 pb-12 px-4 md:px-6 flex flex-col items-center text-center font-inconsolata">
        <h1 className="text-3xl md:text-5xl text-white font-[500] leading-[1] mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-sm text-[#cccccc]">
          Flexible plans built for hobbyists, creators, and teams.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 max-w-7xl mx-auto w-full">
        <PricingSection />
      </section>

      {/* Comparison */}
      <ComparisonSection />

      {/* FAQ */}
      <section className="py-[60px] md:py-20 px-4 max-w-2xl mx-auto w-full">
        <FAQSection />
      </section>

      {/* CTA */}
      <FinalCTASection />

      <Footer />
    </div>
  );
}