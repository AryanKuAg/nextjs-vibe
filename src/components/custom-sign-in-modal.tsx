"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSignIn, useUser } from "@clerk/nextjs";

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

    try {
      window.google?.accounts.id.cancel();
    } catch {
      // ignore
    }

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
        style={{ fontSize: 20 }}
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
              <h2 className="text-white text-[24px] font-light tracking-wide mb-1">
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
              className="bg-white text-black w-fit px-3 py-2.5 flex items-center justify-center gap-2.5 rounded-[8px] transition-colors disabled:opacity-70 h-[36px]"
            >
              {isPending ? (
                <svg
                  className="animate-spin h-4 w-4 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Image src="/google.svg" alt="Google" width={16} height={16} />
              )}
              <span className="text-[15px] font-[500] font-sans">
                Get started
              </span>
            </button>
          </div>

          {/* Fine print */}
          <p className="absolute bottom-6 w-full px-6 text-[#737373] text-[12px] text-center leading-relaxed">
            By signing up, you agree to our{" "}
            <Link
              href="/terms"
              className="text-white transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-white transition-colors"
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
