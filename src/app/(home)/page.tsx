"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import "remixicon/fonts/remixicon.css";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { UserControl } from "@/components/user-control";
import { TemplatesModal } from "@/components/templates-modal";
import { useTemplateRemix } from "@/hooks/use-template-remix";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";

/* ─── Site preview cards data ───
   Sourced from the template registry so the gallery, the remix modal, and the
   build pipeline all agree on which templates exist and what their ids are. */
const SITES = TEMPLATE_REGISTRY.map((t) => ({
  id: t.id,
  title: t.title,
  href: t.demoUrl,
  imgSrc: t.imgSrc,
  isTall: t.isTall,
}));

/* ─── Site Preview Card ─── */
interface SitePreviewCardProps {
  title: string;
  href: string;
  imgSrc: string;
  /** Fixed card height in px. Falls back to a 16:9 box when omitted. */
  height?: number;
  /** If true, uses a simpler opacity-only hover effect without overlays */
  isLandingPage?: boolean;
  /** Template id — enables the Remix pill when provided. */
  templateId?: string;
  onRemix?: (templateId: string) => void;
  isRemixPending?: boolean;
}

const SitePreviewCard = ({
  title,
  href,
  imgSrc,
  height,
  isLandingPage,
  templateId,
  onRemix,
  isRemixPending,
}: SitePreviewCardProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`group block rounded-[8px] font-sans overflow-hidden relative break-inside-avoid ${
      isLandingPage ? "opacity-80 hover:opacity-100 transition-opacity duration-300" : ""
    }`}
  >
    <div
      className={`relative w-full bg-grey-bg ${height ? "" : "aspect-[1280/720]"}`}
      style={height ? { height } : undefined}
    >
      <Image
        src={imgSrc}
        alt={`${title} - 3D website template`}
        fill
        className="object-cover"
      />

      {!isLandingPage && (
        <>
          {/* Top Gradient */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

          {/* Action pills */}
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs px-4 py-1.5 rounded-[10px] font-medium hover:bg-black/60 transition-colors">
              Preview
            </div>
            {templateId && onRemix && (
              <button
                type="button"
                disabled={isRemixPending}
                onClick={(e) => {
                  // The card itself is the "open the demo" link — keep the pill
                  // from following it.
                  e.preventDefault();
                  e.stopPropagation();
                  onRemix(templateId);
                }}
                className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs px-4 py-1.5 rounded-[10px] font-medium hover:bg-black/60 transition-colors disabled:opacity-50"
              >
                {isRemixPending ? "Starting…" : "Remix"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  </a>
);

/* ─── Logged In Dashboard ─── */
const LoggedInDashboard = () => {
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const { remix, isPending: isRemixPending } = useTemplateRemix();
  useCheckoutReturn();
  return (
    <main className="min-h-screen bg-bg font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="flex items-center justify-between p-3 md:px-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Framerate" width={24} height={24} />

        </div>
        <UserControl />
      </header>

      {/* Main Content (Centered) */}
      <div className="flex-1 flex flex-col items-center mt-12 md:mt-24 px-4 w-full">
        <h1 className="text-white-85 text-2xl mb-10 text-center">
          Describe your 3D website. We&apos;ll build it.
        </h1>

        <div className="w-full max-w-3xl">
          <ProjectForm showModelSelector />
        </div>

        {/* Templates Section */}
        <div className="w-full max-w-[960px] mt-30 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white/80 text-sm font-medium">Templates</h2>
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="px-2 rounded-[6px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[14px] hover:bg-white-8  disabled:opacity-50 h-[28px] font-medium leading-[20px]"
            >
              See more
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SITES.map((site, idx) => (
              <SitePreviewCard
                key={`${site.title}-${idx}`}
                title={site.title}
                href={site.href}
                imgSrc={site.imgSrc}
                templateId={site.id}
                onRemix={remix}
                isRemixPending={isRemixPending}
              />
            ))}
          </div>
        </div>
      </div>
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={TEMPLATE_REGISTRY}
      />
    </main>
  );
};


/* ─── Logged Out View ─── */
const LoggedOutView = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { signIn, isLoaded } = useSignIn();
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    if (!isLoaded || isPending) return;
    setIsPending(true);

    try {

      window.google?.accounts.id.cancel();
    } catch {
      // Ignore cancel errors
    }

    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  useEffect(() => {
    let animationFrameId: number;
    let isHovered = false;

    const container = scrollRef.current;
    if (!container) return;

    const handleMouseEnter = () => (isHovered = true);
    const handleMouseLeave = () => (isHovered = false);

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    const scroll = () => {
      if (!isHovered && container) {
        container.scrollTop += 0.5;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
          container.scrollTop = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);


  return (
    <main className="h-screen bg-bg font-sans flex flex-col md:flex-row overflow-hidden">
      {/* ── Left Panel (Fixed) ── */}
      <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 flex flex-col flex-1 md:flex-none justify-between p-3 md:h-screen overflow-y-auto overflow-x-hidden">
        {/* Top: Logo + Content */}
        <div className="flex flex-col p-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10 md:mb-16">
            <Image src="/logo.png" alt="Framerate" width={24} height={24} />
            <span className="text-white font-medium text-base">Framerate</span>
          </div>

          {/* Headline */}
          <h1 className="text-[28px] lg:text-[32px] text-white leading-[36px] font-medium mb-4 font-sans mt-12">
            Ship 3D websites in minutes with AI
          </h1>

          {/* Description */}
          <p className="text-sm text-white-50  leading-[20px] mb-8">
            Just describe your vision and watch it turn into a live, interactive experience in few minutes.
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-8 md:mb-12">
            <SignedOut>
              <button
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="px-3 py-2 rounded-[8px] border border-white-12 text-black text-xs font-medium  flex items-center gap-1.5 bg-white disabled:opacity-70 hover:opacity-80 transition-all duration-200"
              >
                <div className="w-[14px] h-[14px] flex items-center justify-center shrink-0">
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin text-[12px] scale-125" />
                  ) : (
                    <Image src="/google.svg" alt="Google" width={14} height={14} />
                  )}
                </div>
                Continue with Google
              </button>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => router.push("/manage")}
                className="px-4 py-2 rounded-[8px] border border-white-12 text-black text-xs font-medium transition-colors flex items-center gap-1.5 bg-white"
              >
                <i className="ri-arrow-right-line text-sm" />
                Go to Dashboard
              </button>
            </SignedIn>
          </div>
        </div>

        {/* Bottom: Prompt Input */}
        <div className="mt-auto">
          <ProjectForm showModelSelector dropdownDirection="up" isLandingPage />
        </div>
      </div>

      {/* ── Right Panel (Scrollable) ── */}
      <div
        ref={scrollRef}
        className="hidden md:block flex-1 overflow-y-auto p-3 md:pl-0"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Two explicit columns fed round-robin rather than a CSS `columns`
            masonry: the heights alternate tall/short within each column, and
            the second column starts on the short one so the two stagger. */}
        <div className="flex flex-col md:flex-row gap-3">
          {[0, 1].map((col) => (
            <div key={col} className="flex-1 min-w-0 flex flex-col gap-3">
              {SITES
                .filter((_, idx) => idx % 2 === col)
                .map((site, idx) => (
                  <SitePreviewCard
                    key={`${site.title}-${col}-${idx}`}
                    title={site.title}
                    href={site.href}
                    imgSrc={site.imgSrc}
                    height={site.isTall ? 358 : 280}
                    isLandingPage
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};


/* ─── Main Page Export ─── */
export default function Page() {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return <div className="min-h-screen bg-bg" />;
  }

  if (user) {
    return <LoggedInDashboard />;
  }

  return <LoggedOutView />;
}

