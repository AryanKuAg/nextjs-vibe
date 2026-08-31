"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSignIn, useUser } from "@clerk/nextjs";
// The button's pending spinner is a remixicon glyph, and the font is imported
// per-component in this codebase rather than globally.
import "remixicon/fonts/remixicon.css";

interface CustomSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSignInModal = ({ isOpen, onClose }: CustomSignInModalProps) => {
  const { signIn, isLoaded } = useSignIn();
  const { user } = useUser();
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleGoogleSignIn = async () => {
    if (!isLoaded || isPending) return;
    setIsPending(true);

    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  const showDesktopOnlyMessage = isMobile && user;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[9999]"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Close button — top-right of screen */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-white transition-colors bg-[#282828] hover:bg-[#333] leading-none"
        style={{ fontSize: 16 }}
      >
        ✕
      </button>

      {showDesktopOnlyMessage ? (
        <div className="flex flex-col items-center gap-4 px-8 w-full max-w-[420px] text-center font-sans">
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
          />
          <div className="space-y-2">
            <h2 className="text-white text-[20px]">
              This one needs a real screen.
            </h2>
            <p className="text-[#707070] text-sm leading-relaxed">
              Framerate is a desktop experience. Come back on your laptop — it&apos;s worth it.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Centered content */}
          <div className="flex flex-col items-center gap-5 px-6 w-full max-w-[420px]">
            {/* Logo */}
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="mb-1"
            />

            {/* Heading */}
            <div className="text-center mb-6">
              <h2 className="text-white text-[24px] font-medium tracking-wide mb-1">
                Log In or Sign Up
              </h2>
              <p className="text-[#737373] text-[14px]">
                Build 3D websites 10x faster with AI
              </p>
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="px-3 py-2 rounded-[8px] border border-white-12 text-black text-xs font-medium  flex items-center gap-1.5 bg-white disabled:opacity-70 hover:opacity-80 transition-all duration-200"
            >
              <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
                {isPending ? (
                  <i className="ri-loader-4-line animate-spin text-[12px] scale-125" />
                ) : (
                  <Image src="/google.png" alt="Google" width={14} height={14} />
                )}
              </div>
              Continue with Google
            </button>
          </div>

          {/* Fine print */}
          <p className="absolute bottom-6 w-full px-6 text-white/50 text-[12px] text-center leading-relaxed">
            By signing up, you agree to our{" "}
            <Link
              href="/legal"
              className="text-white-85"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal?tab=privacy"
              className="text-white-85"
            >
              Privacy Policy
            </Link>
          </p>
        </>
      )}
    </div>,
    document.body
  );
};
