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
  isPopular?: boolean;
}

export const PricingCard = ({ title, desc, price, features, className, isPopular }: PricingCardProps) => {
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
    <div className={cn("relative flex flex-col bg-[#282828] rounded-[16px] p-4 font-onest", isPopular && "border border-white", className)}>
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-3 py-1 rounded-full text-[12px] font-mono">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-2xl text-white mb-0">{title}</h3>
      <p className="text-sm text-neutral-400 mb-4">{desc}</p>
      <div className="flex items-end gap-2 mb-4">
        <span className="text-[40px] font-[500] text-white leading-[1]">${price}</span>
        <span className="text-sm text-neutral-400 mb-1.5 leading-[1]">Billed monthly</span>
      </div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cn(
          "w-full h-[36px] rounded-lg text-sm font-[500] mb-4 disabled:opacity-50 transition-all",
          isPopular
            ? "bg-white hover:bg-white/90 text-black"
            : "bg-[#333333] hover:bg-[#444444] text-white"
        )}
      >
        {loading ? "Redirecting..." : `Get started`}
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
    desc: "Perfect for personal projects",
    price: "15",
    features: [
      "500 credits / month",
      "40 images and 20 videos",
      "Seedream 4.5 & Pruna Video",
      "2 website",
      "Export websites",
      "Standard generation"
    ],
  },
  {
    title: "Plus",
    desc: "Built for active creators",
    price: "39",
    isPopular: true,
    features: [
      "2,000 credits / month",
      "160 images and 80 videos",
      "Nano Banana 2 & Seedance 2.0",
      "10 websites",
      "Export websites",
      "Priority generation"
    ],
  },
  {
    title: "Pro",
    desc: "Made for teams and studios",
    price: "59",
    features: [
      "3,500 credits / month",
      "240 images and 160 videos",
      "Nano Banana 2 & Seedance 2.0",
      "40 websites",
      "Export websites",
      "Priority generation"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-4">
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
