"use client";

import { useState } from "react";
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
      <footer className="py-20 px-6 max-w-7xl mx-auto w-full font-inconsolata">
        {/* Rounded card container */}
        <div className="bg-neutral-800 rounded-[16px] border border-neutral-700 shadow-sm backdrop-blur-sm px-10 pt-[40px] pb-8">
          {/* Main grid row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 mb-10">
            {/* Left: Logo + description */}
            <div className="max-w-[414px]">
              <div className="flex items-center gap-2.5 mb-[10px]">
                <Image src="/logo.png" alt="framerate" width={20} height={20} />
                <span className="text-white font-[500] text-[16px]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>framerate</span>
              </div>
              <p className="text-sm text-neutral-400">
                The fastest way to go from a text prompt to a live,<br />production-ready 3D website.
              </p>
            </div>

            {/* Right: Nav columns */}
            <div className="grid grid-cols-3 gap-16">
              <div>

              </div>

              <div>
                <h4 className="text-sm  text-[#666666] mb-[10px] tracking-wide uppercase font-[500]">Links</h4>
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
                <h4 className="text-sm  text-[#666666] mb-[10px] tracking-wide uppercase font-[500]">Legal</h4>
                <div className="flex flex-col gap-2">
                  <Link href="/terms" className="text-sm text-white">Terms of service</Link>
                  <Link href="/privacy" className="text-sm text-white">Privacy policy</Link>
                  <Link href="/cookies" className="text-sm text-white">Cookie policy</Link>
                  <Link href="/compliance" className="text-sm text-white">Compliance overview</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-[#41413F33] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-white!">© 2026 Framerate. All rights reserved.</span>
            <div className="flex items-center gap-1.5 group">
              <Link
                href="mailto:teamframerate@gmail.com"
                className="text-sm text-white! hover:opacity-80 transition-opacity"
              >
                teamframerate@gmail.com
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