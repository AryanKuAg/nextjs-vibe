"use client";

import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export interface PricingCardProps {
  title: string;
  desc: string;
  price: string;
  features: string[];
  className?: string;
}

export const PricingCard = ({ title, desc, price, features, className }: PricingCardProps) => {
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const clerk = useClerk();

  const handleCheckout = async () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: title.toLowerCase(), returnUrl: `${window.location.origin}/dashboard` }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (data.url || data.checkoutUrl) {
        window.location.href = data.url || data.checkoutUrl;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      toast.error(errorMessage, { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col bg-[#282828] rounded-[16px] shadow-sm backdrop-blur-sm border border-neutral-700 p-4 font-inconsolata", className)}>
      <h3 className="text-2xl text-white mb-0">{title}</h3>
      <p className="text-sm text-neutral-400 mb-8">{desc}</p>
      <div className="flex items-end gap-2 mb-6">
        <span className="text-[40px] font-[500] text-white leading-[1]">${price}</span>
        <span className="text-sm text-neutral-400 mb-1.5 leading-[1]">Billed monthly</span>
      </div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full h-[36px] bg-white text-black rounded-lg text-sm font-[500] mb-8 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Redirecting..." : `Get ${title.toLowerCase()}`}
      </button>
      <div className="flex flex-col gap-1">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-white leading-[20px]">
            <i className="ri-check-line text-white text-sm" />
            <span className="">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PLANS: PricingCardProps[] = [
  {
    title: "Basic",
    desc: "For hobbyists and explorers",
    price: "19",
    features: [
      "1,200 credits / mo",
      "~120 Images or ~15 Videos",
      "~12 Pro Website Builds",
      "Neon DB & GCP Hosting",
      "Veo 3.1 & Nano Banana Pro"
    ],
  },
  {
    title: "Plus",
    desc: "For power creators and freelancers",
    price: "39",
    features: [
      "3,000 credits / mo",
      "~300 Images or ~40 Videos",
      "~30 Pro Website Builds",
      "Priority Sandboxes (E2B)",
      "Veo 3.1 & Nano Banana Pro"
    ],
  },
  {
    title: "Pro",
    desc: "For agencies and AI startups",
    price: "59",
    features: [
      "5,500 credits / mo",
      "~550 Images or ~75 Videos",
      "~55 Pro Website Builds",
      "Long-running Sessions (1hr+)",
      "Veo 3.1 & Nano Banana Pro"
    ],
  },
];

interface PricingSectionProps {
  title?: string;
}

export const PricingSection = ({ title }: PricingSectionProps) => {
  const pathname = usePathname();
  const isProjectPage = pathname?.startsWith("/projects/");

  const projectDescs: Record<string, string> = {
    "Basic": "For first-time AI content creators",
    "Plus": "For consistent and easy AI content creation",
    "Pro": "For creators building AI projects",
  };

  return (
    <div>
      {title && (
        <h2 className="text-3xl md:text-[40px] font-mono text-center text-white mb-10">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.title}
            {...plan}
            desc={isProjectPage ? projectDescs[plan.title] : plan.desc}
          />
        ))}
      </div>
    </div>
  );
};
