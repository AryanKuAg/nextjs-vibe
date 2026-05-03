"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";

interface CustomSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSignInModal = ({ isOpen, onClose }: CustomSignInModalProps) => {
  const { signIn, isLoaded } = useSignIn();
  const [isPending, setIsPending] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: "#1a1a1a", zIndex: 99999 }}
    >
      {/* Close button — top-right of screen */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-[#888] hover:text-white transition-colors"
        style={{ fontSize: 20 }}
      >
        ✕
      </button>

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
        <div className="text-center">
          <h2 className="text-white text-[26px] font-light tracking-wide mb-1">
            Log In or Sign Up
          </h2>
          <p className="text-[#888] text-[14px]">
            Build 3D websites 10x faster with AI
          </p>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending}
          className="w-full h-[48px] flex items-center justify-center gap-3 rounded-[8px] transition-colors disabled:opacity-70"
          style={{ backgroundColor: "#2a2a2a", color: "#fff", border: "1px solid #3a3a3a" }}
        >
          {isPending ? (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Image src="/google.svg" alt="Google" width={18} height={18} />
          )}
          <span className="text-[15px] font-medium font-inconsolata">
            Continue with Google
          </span>
        </button>

        {/* Fine print */}
        <p className="text-[#555] text-[12px] text-center leading-relaxed">
          By signing up, you agree to our{" "}
          <Link
            href="/terms"
            className="underline text-[#666] hover:text-[#888] transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline text-[#666] hover:text-[#888] transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
};
