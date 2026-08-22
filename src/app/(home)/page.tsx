"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { UserControl } from "@/components/user-control";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { useTRPC } from "@/trpc/client";
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

/** Templates shown inline on the dashboard — three full rows. The rest are
 *  reachable through the See more modal, which gets the whole registry. */
const DASHBOARD_TEMPLATE_COUNT = 9;

/**
 * Tall/short rhythm for the landing page's right-panel grid, one row of four
 * per column. This is the reference layout's own stagger, not derived from
 * each template's `isTall` flag — those two orderings don't agree.
 */
const RIGHT_PANEL_TALL_PATTERN: readonly boolean[][] = [
  [true, false, false, true],
  [true, false, false, true],
  [false, true, true, false],
];

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
}: SitePreviewCardProps) => {
  // Some registry entries are placeholders awaiting a deployed demo and cover
  // image (see the TODO in registry.ts) — render the empty slot rather than
  // asking next/image to fetch an empty src.
  if (!imgSrc || !href) {
    return (
      <div
        aria-hidden
        className="w-full rounded-[12px] border border-white-8 bg-grey-bg break-inside-avoid"
        style={height ? { height } : undefined}
      />
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-[12px] border border-white-8 font-sans overflow-hidden relative break-inside-avoid ${isLandingPage ? "opacity-80 hover:opacity-100 transition-opacity duration-300" : ""
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
};

/* ─── Upgrade pill ───
   Sits beside the avatar in the dashboard header. Hidden on paid plans, whose
   affordance is the credits bar inside the account menu instead. */
const UpgradeButton = () => {
  const trpc = useTRPC();
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

  // Nothing until the plan is known, so paid users never see the pill flash.
  if (usage === undefined) return null;
  if (usage?.plan && usage.plan !== "free") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPricingModalOpen(true)}
        className="h-[28px] flex items-center gap-[6px] rounded-[8px] border border-white-12 bg-white-8 pl-[8px] pr-[10px] font-onest text-[13px] font-medium leading-[20px] text-white hover:bg-white-12 transition-colors"
      >
        <i className="ri-vip-diamond-fill text-[13px] text-white-85" />
        <span className="[text-box:trim-both_cap_alphabetic]">Upgrade</span>
      </button>
      <CustomOutOfCreditsModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </>
  );
};

/* ─── Dashboard grid backdrop ───
   The dashed rule under the header and the pair of dashed verticals bracketing
   the content column, both from the design. Decoration only. The verticals run
   the full height and cross the rule — in the design they meet the top edge
   rather than hanging off the rule, so only the horizontal is offset by 104px. */
const DashboardGrid = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
    <div className="absolute inset-x-0 top-[104px] border-t border-dashed border-white/[0.07]" />
    <div className="absolute inset-y-0 left-1/2 -ml-[520px] w-[1040px] border-x border-dashed border-white/[0.07]" />
  </div>
);

/* ─── Logged In Dashboard ─── */
const LoggedInDashboard = () => {
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const { remix, isPending: isRemixPending } = useTemplateRemix();
  useCheckoutReturn();
  return (
    // overflow-x-clip: the grid backdrop is wider than the content box wherever
    // a classic scrollbar is present.
    <main className="relative min-h-screen bg-bg font-sans flex flex-col overflow-x-clip">
      <DashboardGrid />

      {/* Top Navigation */}
      <header className="relative z-10 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Framerate" width={32} height={32} />
        </div>
        <div className="flex items-center gap-3">
          <UpgradeButton />
          <UserControl />
        </div>
      </header>

      {/* Main Content (Centered) */}
      <div className="relative z-10 flex-1 flex flex-col items-center mt-12 md:mt-20 px-4 w-full">
        <h1 className="text-white-85 font-onest font-semibold text-[28px] leading-[36px] md:text-[38px] md:leading-[48px] text-center">
          What do you want to create?
        </h1>
        <p className="mt-3 mb-10 text-center text-sm leading-[20px] text-white-50 font-onest">
          AI builds the design, motion, and experience from a simple prompt.
        </p>

        <div className="w-full max-w-[680px]">
          <ProjectForm showModelSelector />
        </div>

        {/* Templates Section — 1008 wide, 24px padding and gap, white 4% on
            both the fill and the border, per the design. */}
        <div className="w-full max-w-[1008px] mt-[100px] mb-12 rounded-[24px] border border-white-4 bg-white-4 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white/80 text-sm font-onest font-medium">Templates</h2>
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="px-2 rounded-[8px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[14px] font-onest hover:bg-white-8 disabled:opacity-50 h-[28px] font-medium leading-[20px]"
            >
              See more
            </button>
          </div>

          {/* 960px of inner width: three 304px cards and two 24px gutters.
              Three rows here; the rest of the registry lives behind See more. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {SITES.slice(0, DASHBOARD_TEMPLATE_COUNT).map((site, idx) => (
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



  return (
    <main className="md:h-screen bg-bg font-sans flex flex-col md:flex-row md:overflow-hidden">
      {/* ── Left Panel (Fixed) ── */}
      <div className="w-full md:w-[320px] lg:w-[420px] shrink-0 flex flex-col justify-between py-3 px-4 md:p-3 md:h-screen md:overflow-y-auto md:overflow-x-hidden">
        {/* Top: Logo + Content */}
        <div className="flex flex-col py-3 md:p-3">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <Image src="/logo.png" alt="Framerate" width={50} height={32} />
            {/* <span className="text-white font-medium text-base">Framerate</span> */}

            {/* Mobile: compact auth pill next to the logo — the full-width
                button below is desktop-only there. */}
            <div className="flex md:hidden items-center">
              <SignedOut>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isPending}
                  className="h-10 pl-3 pr-4 rounded-[8px] bg-white-12 text-white text-sm font-onest font-semibold flex items-center gap-2 disabled:opacity-70 hover:bg-white-16 transition-colors"
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isPending ? (
                      <i className="ri-loader-4-line animate-spin text-xs" />
                    ) : (
                      <Image src="/google.svg" alt="Google" width={16} height={16} />
                    )}
                  </div>
                  Sign up
                </button>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => router.push("/manage")}
                  className="h-9 px-4 rounded-full bg-white text-black text-sm font-onest font-medium flex items-center gap-1.5"
                >
                  <i className="ri-arrow-right-line text-sm" />
                  Dashboard
                </button>
              </SignedIn>
            </div>
          </div>

          {/* Social proof pill */}
          <div className="inline-flex items-center gap-1 border border-white-16 rounded-full h-[22px] pl-0.5 pr-2 mt-8 md:mt-20 w-fit">
            {/* Overlapping avatars */}
            <div className="flex items-center">
              <div className="w-4 h-4 shrink-0 rounded-full overflow-hidden border-1 border-white relative z-30">
                <Image src="/female_1.avif" alt="User" width={16} height={16} className="object-cover w-full h-full" />
              </div>
              <div className="w-4 h-4 shrink-0 rounded-full overflow-hidden border-1 border-white -ml-1.5 relative z-20">
                <Image src="/male_1.avif" alt="User" width={16} height={16} className="object-cover w-full h-full" />
              </div>
              <div className="w-4 h-4 shrink-0 rounded-full overflow-hidden border-1 border-white -ml-1.5 relative z-10">
                <Image src="/male_2.avif" alt="User" width={16} height={16} className="object-cover w-full h-full" />
              </div>
            </div>
            <span className="text-white text-sm leading-none font-onest font-medium whitespace-nowrap">Trusted by 20k+ users</span>
          </div>

          {/* Headline */}
          <h1 className="text-[40px] text-white leading-[120%] font-bold mb-4 font-onest mt-4">
            Build 3D Websites With AI
          </h1>

          {/* Description */}
          <p className="text-2xl text-white-50 font-onest leading-[32px] mb-5 md:mb-12 font-medium">
            Describe your vision and watch it turn into a live interactive experience in few minutes.
          </p>

          {/* Action buttons — desktop only; mobile uses the compact pill by the logo. */}
          <div className="hidden md:flex items-center gap-2 mb-8 md:mb-12">
            <SignedOut>
              <button
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="h-[40px] px-[12px] rounded-[8px] border border-white-12 text-black text-sm font-onest font-semibold flex items-center gap-[8px] bg-white disabled:opacity-70 hover:opacity-80 transition-all duration-200 "
              >
                <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0">
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin text-[12px] scale-125" />
                  ) : (
                    <Image src="/google.svg" alt="Google" width={16} height={16} />
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
        <div className="mb-14 md:mb-0 md:mt-auto">
          <ProjectForm showModelSelector isLandingPage />
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="w-full md:flex-1 pt-3 pb-4 px-4 md:p-3 md:pl-0 md:overflow-y-auto">
        {/* Mobile: the templates as one vertical column, in source order. */}
        <div className="flex md:hidden flex-col gap-4">
          {SITES.slice(0, 12).map((site, idx) => (
            <div
              key={site.title}
              aria-hidden
              className="w-full rounded-[12px] border border-white-12"
              style={{ height: idx % 2 === 0 ? 238 : 189 }}
            />
          ))}
        </div>

        {/* Desktop: three explicit columns fed round-robin rather than a CSS
            `columns` masonry: the heights alternate tall/short within each
            column, so the columns stagger against each other.

            TEMPORARY: real covers are switched off and every slot renders as
            an empty bordered box, four per column. Restore by swapping this
            block back to the SitePreviewCard render it replaced. */}
        <div className="hidden md:flex md:flex-row gap-3">
          {[0, 1, 2].map((col) => (
            <div key={col} className="flex-1 min-w-0 flex flex-col gap-3">
              {SITES
                .filter((_, idx) => idx % 3 === col)
                .slice(0, 4)
                .map((site, slotIdx) => (
                  <div
                    key={`${site.title}-${col}-${slotIdx}`}
                    aria-hidden
                    className="w-full rounded-[12px] border border-white-12"
                    style={{ height: RIGHT_PANEL_TALL_PATTERN[col][slotIdx] ? 238 : 189 }}
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

