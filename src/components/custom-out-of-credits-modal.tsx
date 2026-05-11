"use client";

import Link from "next/link";
import Image from "next/image";
import { PLANS, PricingCard } from "@/modules/home/ui/components/pricing-section";
import { usePathname } from "next/navigation";

interface CustomOutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomOutOfCreditsModal = ({ isOpen, onClose }: CustomOutOfCreditsModalProps) => {
  const pathname = usePathname();
  const isProjectPage = pathname?.startsWith("/projects/");

  const projectDescs: Record<string, string> = {
    "Basic": "For first-time AI content creators",
    "Plus": "For consistent and easy AI content creation",
    "Pro": "For creators building AI projects",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="bg-background rounded-[16px] w-full max-w-[1200px] p-6 md:p-16 md:pt-10  relative overflow-y-auto max-h-[90vh]"
        style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.45)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-[#8A8A8A] hover:text-white transition-colors"
        >
          <i className="ri-close-line text-[24px]" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-10">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <Image src="/logo.png" alt="Logo" width={24} height={24} />
            <span className="text-white font-[500] text-[20px] font-space-grotesk tracking-tight">framerate</span>
          </Link>

          <h2 className="text-3xl md:text-[40px] text-white font-inconsolata mb-4 tracking-tight font-[500]">Upgrade to keep creating</h2>
          <p className="text-neutral-400 text-sm leading-sm font-inconsolata mx-auto">
            You&apos;ve used all your free credits. Choose a plan to continue building 3D websites.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-inconsolata">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.title}
              {...plan}
              desc={isProjectPage ? projectDescs[plan.title] : plan.desc}
              className="bg-[#272725]/50 border-[#3B3B3B] p-6 hover:border-white/20 transition-all"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
