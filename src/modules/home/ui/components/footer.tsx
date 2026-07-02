"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export const Footer = () => {
  const { user } = useUser();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText("teamframerate@gmail.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
    })
  );

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setShowSignInModal(true);
    } else {
      await createProject.mutateAsync({ value: "" });
    }
  };

  const isPending = createProject.isPending;

  return (
    <>
      <CustomSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
      <footer className="px-5 py-6  md:py-20 md:px-6 max-w-7xl mx-auto w-full font-onest font-[500]">
        {/* Rounded card container */}
        <div className="rounded-[24px] px-5 py-6 md:px-10 md:pt-[40px] md:pb-8  bg-gradient-to-b from-[#282828] to-[#282828]/40">
          {/* Main grid row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 md:gap-24 mb-6 md:mb-10">
            {/* Left: Logo + description */}
            <div className="max-w-lg pr-4">
              <div className="flex items-center gap-2.5 mb-[12px]">
                <Image src="/logo.png" alt="framerate" width={32} height={32} />
                <span className="text-white font-[700] text-[20px]" style={{ fontFamily: 'var(--font-stack-sans-notch)' }}>Framerate</span>
              </div>
              <p className="text-sm text-neutral-400 ">
                The fastest way to go from a text prompt to a live,<br className="hidden md:block" /> production-ready 3D website.
              </p>
            </div>

            {/* Right: Nav columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto_auto] gap-6 md:gap-8 lg:gap-16">
              <div>
                <h4 className="text-sm text-[#666666] mb-[10px] tracking-wide leading-[2.85] uppercase font-[500]">Product</h4>
                <div className="flex flex-col gap-2 items-start">
                  <button
                    onClick={handleDashboardClick}
                    disabled={isPending}
                    className="text-sm text-white hover:text-[#CCCCCC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dashboard
                  </button>
                  <Link href="/pricing" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">Pricing</Link>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-[#666666] mb-[10px] tracking-wide uppercase leading-[2.85] font-[500]">Links</h4>
                <div className="flex flex-col gap-2 items-start">
                  <Link href="/blog" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">Blog</Link>
                </div>
              </div>

              <div>
                <h4 className="text-sm leading-[2.85] text-[#666666] mb-[10px] tracking-wide uppercase font-[500]">Legal</h4>
                <div className="flex flex-col gap-2">
                  <Link href="/terms" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">Terms of service</Link>
                  <Link href="/privacy" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">Privacy policy</Link>
                  <Link href="/cookies" className="text-sm text-white hover:text-[#CCCCCC] transition-colors">Cookie policy</Link>
                </div>
              </div>

              <div>
                <h4 className="text-sm leading-[2.85] text-[#666666] mb-[10px] tracking-wide uppercase font-[500]">Social</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-4">
                    <a href="https://www.facebook.com/framerate.space/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#CCCCCC]" aria-label="Facebook"><i className="ri-facebook-circle-fill text-lg"></i></a>
                    <a href="https://twitter.com/framerate.space" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#CCCCCC]" aria-label="X (Twitter)"><i className="ri-twitter-x-line text-lg"></i></a>
                    <a href="https://www.instagram.com/framerate.space" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#CCCCCC]" aria-label="Instagram"><i className="ri-instagram-line text-lg"></i></a>
                    <a href="https://linkedin.com/company/framerate.space/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#CCCCCC]" aria-label="LinkedIn"><i className="ri-linkedin-fill text-lg"></i></a>
                    <a href="https://www.youtube.com/channel/UCfrB9eKkVyu7ZT2Xdj-Amsg" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#CCCCCC]" aria-label="YouTube"><i className="ri-youtube-fill text-lg"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-10 border-t border-[#41413F33] flex flex-col sm:flex-row items-start md:items-center justify-between gap-4">
            <span className="text-sm text-white!">© 2026 Framerate. All rights reserved.</span>
            <div className="flex items-center gap-1.5 group">
              <Link
                href={mounted ? "mailto:teamframerate@gmail.com" : "#"}
                className="text-sm text-white! hover:opacity-80 transition-opacity"
              >
                {mounted ? "teamframerate@gmail.com" : "Email us"}
              </Link>
              <button
                onClick={handleCopy}
                className="text-white transition-colors"
                aria-label="Copy email"
              >
                <i
                  key={copied ? "check" : "copy"}
                  className={`${copied ? "ri-check-line text-white" : "ri-file-copy-line text-white"
                    } text-xs inline-block`}

                />

              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
//