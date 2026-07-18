"use client";

import { useState } from "react";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(2px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  }
};

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
  const { signIn, isLoaded } = useSignIn();

  const handleCheckout = async () => {
    if (!isSignedIn) {
      if (!isLoaded) return;
      setLoading(true);

      try {
        window.google?.accounts.id.cancel();
      } catch {
        // Ignore
      }

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: `${window.location.pathname}#pricing`,
      });
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
    <div className={cn("relative flex flex-col  bg-gradient-to-b from-[#282828] to-[#282828]/40 rounded-[24px] font-[500] p-6 font-sans", isPopular && "border-2 border-white", className)}>
      {isPopular && (
        <Image
          src="/pricing_gradient.png"
          alt="Pricing glow"
          fill
          className="object-contain object-bottom rounded-[24px] z-0 pointer-events-none saturate-200 contrast-[100%]"
        />
      )}
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-3 py-1 rounded-full text-[12px] font-mono z-10">
          MOST POPULAR
        </div>
      )}
      <div className="relative z-10 flex flex-col h-full">
        <h3 className="text-2xl text-white mb-0 text-start">{title}</h3>
        <p className="text-sm text-neutral-400 mb-5 text-start">{desc}</p>
        <div className="flex items-end gap-2 mb-5">
          <span className="text-[40px] font-[500] text-white leading-[1]">${price}</span>
          <span className="text-sm text-neutral-400 mb-1.5 leading-[1]">Billed monthly</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={loading}
          className={cn(
            "w-full h-[52px] rounded-[12px] text-sm font-[500] flex items-center justify-center gap-2 mb-5 disabled:opacity-70 transition-all",
            isPopular
              ? "bg-white hover:bg-white/90 text-black"
              : "bg-[#333333] hover:bg-[#444444] text-white"
          )}
        >
          {loading ? (
            <>
              <svg className={cn("animate-spin h-4 w-4 shrink-0", isPopular ? "text-black" : "text-white")} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting...
            </>
          ) : (
            <>
              Get started
            </>
          )}
        </button>
        <div className="flex flex-col gap-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white leading-[20px]">
              <i className="ri-check-line text-white text-sm" />
              <span className="">{f}</span>
            </div>
          ))}
        </div>
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
      "Nano Banana 2 & Veo 3.1",
      "2 website",
      "Template gallery",
      "Full site export",
      "No coding required",
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
      "10 website",
      "Template gallery",
      "Full site export",
      "No coding required",
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
      "40 website",
      "Template gallery",
      "Full site export",
      "No coding required",
      "Priority generation"
    ],
  },
];

interface PricingSectionProps {
  title?: string;
  desc?: string;
}

export const PricingSection = ({ title, desc }: PricingSectionProps) => {
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
        <h2 className="text-3xl md:text-5xl text-white font-[500] leading-[1] mb-4 font-stack-sans-notch">
          {title}
        </h2>
      )}
      {desc && (
        <p className="text-sm text-[#737373] mb-20">
          {desc}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-4">
        {PLANS.map((plan) => (
          <motion.div key={plan.title} variants={itemVariants}>
            <PricingCard
              {...plan}
              desc={isProjectPage ? projectDescs[plan.title] : plan.desc}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
