"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import "remixicon/fonts/remixicon.css";

interface CustomOutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODAL_PLANS = [
  {
    key: "plus",
    title: "Plus",
    desc: "Perfect for personal projects",
    monthlyPrice: "10",
    yearlyPrice: "8",
    features: [
      "100 credits",
      "Standard AI models",
      "Template gallary",
      "Full site export",
      "No coding required",
      "Standard generation",
    ],
  },
  {
    key: "pro",
    title: "Pro",
    desc: "Built for active creators",
    monthlyPrice: "20",
    yearlyPrice: "16",
    isPopular: true,
    features: [
      "500 credits",
      "Frontier AI models",
      "Template gallary",
      "Full site export",
      "No coding required",
      "Priority generation",
    ],
  },
  {
    key: "max",
    title: "Max",
    desc: "Made for teams and studios",
    monthlyPrice: "40",
    yearlyPrice: "32",
    features: [
      "1,500 credits",
      "Frontier AI models",
      "Template gallary",
      "Full site export",
      "No coding required",
      "Fastest generation",
    ],
  },
];

const ModalPricingCard = ({
  plan,
  billing,
}: {
  plan: (typeof MODAL_PLANS)[number];
  billing: "monthly" | "yearly";
}) => {
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useAuth();
  const { signIn, isLoaded } = useSignIn();

  const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

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
        body: JSON.stringify({
          plan: plan.key,
          billing,
          returnUrl: window.location.origin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (data.url || data.checkoutUrl) {
        window.location.href = data.url || data.checkoutUrl;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(errorMessage, { duration: Infinity });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-[10px] p-2 font-sans",
        plan.isPopular
          ? "border-0 bg-white/[0.12]"
          : "border-[0.5px] border-white/[0.08] bg-transparent"
      )}
    >
      <div className="flex flex-col p-1 pt-3 pb-4">

        <h3 className="text-2xl font-medium text-white-85 mb-0.5 leading-[28px]">{plan.title}</h3>
        <p className="text-[12px] text-white-50 mb-4 leading-[18px]">{plan.desc}</p>
      </div>

      <div className="flex items-end gap-2 mb-6 px-1">
        <span className="text-[36px] font-medium text-white-85 leading-[28px]">
          ${price}
        </span>
        <span className="text-[12px] text-white-50 mb-1.5 leading-[0px]">
          {billing === "monthly" ? "Billed monthly" : "per month, billed annually"}
        </span>
      </div>

      <div className="flex flex-col gap-1 mb-12 flex-1 px-1">
        {plan.features.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-[12px] text-white-85 leading-[18px]"
          >
            <Image src="/check.svg" alt="Check" width={16} height={16} className="shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cn(
          "w-full h-[40px] rounded-[6px] text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-70 transition-all leading-[20px]",
          plan.isPopular
            ? "bg-white-12 hover:bg-white-16 text-white"
            : "bg-transparent border-[0.5px] border-white-8 hover:bg-white-8 text-white-85"
        )}
      >
        {loading ? (
          <>
            Redirecting...
          </>
        ) : (
          "Upgrade"
        )}
      </button>
    </div>
  );
};

export const CustomOutOfCreditsModal = ({
  isOpen,
  onClose,
}: CustomOutOfCreditsModalProps) => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  // Every trigger for this modal sits inside some positioned, z-indexed shell
  // (the dashboard header, the builder panels). A fixed overlay is still bound
  // by that ancestor's stacking context, so sibling content painted later wins
  // and the modal ends up underneath it. Portalling to the body escapes them all.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The dialog owns the viewport while it is open. Letting the page keep
  // scrolling underneath detaches the backdrop from the content it is dimming
  // and scrolls the trigger out from under the user. The padding makes up for
  // the scrollbar the lock removes so the page behind does not jump sideways
  // on open (a no-op wherever scrollbars are overlays, as on macOS).
  useEffect(() => {
    if (!isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const basePadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${basePadding + scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-grey-bg rounded-[16px] w-full max-w-[948px] p-4 relative overflow-y-auto max-h-[90vh] font-sans border-[0.5px] border-white-12"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4  ">
              <span className="text-white/50 text-[14px] font-medium">
                Upgrade
              </span>

              {/* Monthly / Yearly Toggle */}
              <div className="flex items-center gap-1 text-[14px]">
                <button
                  onClick={() => setBilling("monthly")}
                  className={cn(
                    "transition-colors font-medium",
                    billing === "monthly"
                      ? "text-white-85"
                      : "text-white/50 hover:text-white/85"
                  )}
                >
                  Monthly
                </button>
                <span className="text-white/30 mx-1">/</span>
                <button
                  onClick={() => setBilling("yearly")}
                  className={cn(
                    "transition-colors font-medium",
                    billing === "yearly"
                      ? "text-white"
                      : "text-white/50 hover:text-white/85"
                  )}
                >
                  Yearly
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors h-7 w-7 hover:bg-white-8 rounded-[6px] group"
              >
                <i className="ri-close-line text-[20px] group-hover:text-white-85 " />
              </button>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {MODAL_PLANS.map((plan) => (
                <ModalPricingCard key={plan.key} plan={plan} billing={billing} />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
