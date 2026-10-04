"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { CustomSignInModal } from "@/components/custom-sign-in-modal";

/**
 * The download route answers 401 to anyone signed out, which from a public page
 * would land a visitor on a bare JSON error. Signed out, this opens the same
 * sign-in modal the navbar uses instead.
 */
export function TemplateDownloadButton({ templateId }: { templateId: string }) {
  const { isSignedIn } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isSignedIn) {
            // An attachment, so the page stays where it is.
            window.location.assign(`/api/templates/${encodeURIComponent(templateId)}/download`);
          } else {
            setShowSignIn(true);
          }
        }}
        className="inline-flex items-center gap-2 px-6 py-4 rounded-[12px] border border-[#2A2A2A] text-white text-sm font-[500] hover:bg-white/10 transition-colors"
      >
        <i aria-hidden className="ri-download-2-line text-base" />
        Download code
      </button>
      <CustomSignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
