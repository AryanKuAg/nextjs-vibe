"use client";

import Image from "next/image";
import { useSignIn } from "@clerk/nextjs";

interface CustomSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomSignInModal = ({ isOpen, onClose }: CustomSignInModalProps) => {
  const { signIn, isLoaded } = useSignIn();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-[#1C1C1C] rounded-[24px] w-full max-w-[360px] p-6 relative border border-[#3B3B3B] mx-4"
        style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.45)" }}
      >
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8A8A8A] hover:text-white transition-colors"
        >
          <i className="ri-close-line text-[22px]" />
        </button>
        
        <Image src="/logo.png" alt="Logo" width={28} height={28} className="mb-6" />
        
        <h2 className="text-[22px] text-white font-inconsolata mb-6 tracking-wide">Create account</h2>
        
        <button 
          type="button"
          onClick={() => {
            if (isLoaded && signIn) {
              signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/"
              });
            }
          }}
          className="w-full h-[46px] flex items-center justify-center gap-3 bg-white text-[#1C1C1C] rounded-[10px] hover:bg-[#F3F3F3] transition-colors"
        >
          <Image src="/google.svg" alt="Google" width={18} height={18} />
          <span className="text-[15px] font-medium font-inconsolata">Continue with Google</span>
        </button>

        <p className="mt-5 text-center text-[#8A8A8A] text-[13px] font-inconsolata">
          If you already have an account, we&apos;ll log you in
        </p>
      </div>
    </div>
  );
};
