"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

interface CustomOutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomOutOfCreditsModal = ({ isOpen, onClose }: CustomOutOfCreditsModalProps) => {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div 
        className="bg-[#1C1C1C] rounded-[24px] w-full max-w-[360px] p-6 relative border border-[#3B3B3B]"
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
        
        <h2 className="text-[22px] text-white font-inconsolata mb-3 tracking-wide">You&apos;re out of credits</h2>
        
        <p className="text-[#8A8A8A] text-[15px] font-inconsolata mb-8 leading-relaxed">
          Your free plan credits have been used up.<br/>Upgrade to keep building.
        </p>
        
        <div className="space-y-3 font-inconsolata">
          <button 
            type="button"
            onClick={() => {
              onClose();
              router.push("/pricing");
            }}
            className="w-full h-[46px] flex items-center justify-center bg-white text-[#1C1C1C] rounded-[10px] hover:bg-[#F3F3F3] transition-colors font-medium text-[15px]"
          >
            Upgrade
          </button>
          
          <button 
            type="button"
            onClick={onClose}
            className="w-full h-[46px] flex items-center justify-center bg-transparent border border-[#3B3B3B] text-[#CCCCCC] rounded-[10px] hover:bg-white/5 transition-colors font-medium text-[15px]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
