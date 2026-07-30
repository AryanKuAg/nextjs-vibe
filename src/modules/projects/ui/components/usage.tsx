"use client";

import { useState } from "react";

import { useAuth } from "@clerk/nextjs";
import "remixicon/fonts/remixicon.css";


import { Button } from "@/components/ui/button";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";

interface Props {
  credits: number;
};

export const Usage = ({ credits }: Props) => {
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });
  const [showPricingModal, setShowPricingModal] = useState(false);

  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      {/* Pricing lives in this modal — there is no standalone /pricing page. */}
      <CustomOutOfCreditsModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />
      <div className="flex items-center gap-x-2">
        <div>
          <p className="text-sm">
            {credits} {hasProAccess ? "": "free"} credits remaining
          </p>
        </div>
        {!hasProAccess && (
          <Button
            size="sm"
            variant="tertiary"
            className="ml-auto"
            onClick={() => setShowPricingModal(true)}
          >
            <i className="ri-crown-line" /> Upgrade
          </Button>
        )}
      </div>
    </div>
  );
};
