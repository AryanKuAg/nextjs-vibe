"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export const Footer = () => {
  return (
    <footer className="py-20 px-6 max-w-7xl mx-auto w-full font-inconsolata">
      {/* Rounded card container */}
      <div className="bg-[#272725] rounded-[8px] px-10 pt-[40px] pb-8">
        {/* Main grid row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 mb-10">
          {/* Left: Logo + description */}
          <div className="max-w-[414px]">
            <div className="flex items-center gap-2.5 mb-[10px]">
              <Image src="/logo.svg" alt="Spatial" width={20} height={20} />
              <span className="text-white font-[500] tracking-wide text-lg">Spatial</span>
            </div>
            <p className="text-sm text-[#CCCCCC]">
              The fastest way to go from a text prompt to a live,<br />production-ready 3D website.
            </p>
          </div>

          {/* Right: Nav columns */}
          <div className="grid grid-cols-3 gap-16">
            <div>
              <h4 className="text-sm text-[#666666] mb-[10px] tracking-wide">Product</h4>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-sm text-white">Templates</Link>
                <Link href="#" className="text-sm text-white">Process</Link>
                <Link href="#" className="text-sm text-white">Pricing</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm  text-[#666666] mb-[10px] tracking-wide">Resources</h4>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-sm text-white">About</Link>
                <Link href="#" className="text-sm text-white">How it works</Link>
                <Link href="#" className="text-sm text-white">Features</Link>
                <Link href="#" className="text-sm text-white">Changelog</Link>
                <Link href="#" className="text-sm text-white">Contact</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm  text-[#666666] mb-[10px] tracking-wide">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href="#" className="text-sm text-white">Privacy policy</Link>
                <Link href="#" className="text-sm text-white">Cookie policy</Link>
                <Link href="#" className="text-sm text-white">Terms of service</Link>
                <Link href="#" className="text-sm text-white">Compliance</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[#41413F33] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-white!">© 2026 Spatial. All rights reserved.</span>
          <div className="flex items-center gap-1.5 group">
            <Link
              href="mailto:contact@spatial.ai"
              className="text-sm text-white! hover:opacity-80 transition-opacity"
            >
              contact@spatial.ai
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText("contact@spatial.ai");
                toast.success("Email copied to clipboard");
              }}
              className="text-white transition-colors"
              aria-label="Copy email"
            >
              <i className="ri-file-copy-line text-xs" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
