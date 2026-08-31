"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SignedIn, SignedOut, useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { UserControl } from "@/components/user-control";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { useTRPC } from "@/trpc/client";
import { TemplatesModal } from "@/components/templates-modal";
import { useCheckoutReturn } from "@/hooks/use-checkout-return";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";

/* ─── Site preview cards data ───
   Sourced from the template registry so the gallery, the remix modal, and the
   build pipeline all agree on which templates exist and what their ids are. */
const SITES = TEMPLATE_REGISTRY.map((t) => ({
  id: t.id,
  title: t.title,
  href: t.demoUrl,
  landingImgSrc: t.landingImgSrc,
  homescreenImgSrc: t.homescreenImgSrc,
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

/** How many templates the signed-out grid shows: three columns of four. */
const LANDING_TILE_COUNT = 12;

/**
 * The reveal cascade shared by the template grids — the signed-out landing
 * panel and the dashboard's Templates section.
 *
 * The tiles arrive one at a time rather than all at once: a dozen covers
 * appearing together read as a layout that failed to load, whereas a cascade
 * reads as content on its way in. A tile's `order` is its position in that
 * cascade, not its position in a column — the desktop grid is fed round-robin,
 * so ordering by column would run three separate animations side by side.
 * Feeding it the registry index instead sweeps the reveal row by row, left to
 * right, which is the order the eye reads the grid in anyway.
 *
 * That cascade is a queue rather than a per-tile delay, because a delay only
 * holds on a warm cache. On a cold load the covers come back from the image
 * optimizer in whatever order it finishes them, so tiles on a timer reveal
 * empty and then fill in at random — which is why the grid used to look
 * ordered only once the images were cached. The queue releases tile N once its
 * own cover has settled and every tile before it has been released, so the
 * order on screen is the registry's no matter what order the network answers
 * in.
 */
const REVEAL_STAGGER_SECONDS = 0.07;

/** Minimum gap between two releases, so a warm cache still reads as a cascade. */
const REVEAL_PACE_MS = REVEAL_STAGGER_SECONDS * 1000;

/**
 * How long the queue is willing to wait on covers at all. Past this the grid
 * drains on the pace alone and tiles fill in as their images land: on a slow
 * connection a strictly ordered reveal would leave most of the panel empty for
 * as long as the slowest cover takes, which is worse than an unordered one.
 */
const REVEAL_GRACE_MS = 2500;

interface RevealQueue {
  /** Tile `order` has had its turn once `order < releasedCount`. */
  releasedCount: number;
  /** Called when a tile's cover has loaded, failed, or turned out not to exist. */
  markSettled: (order: number) => void;
}

/** Outside a provider there is nothing to sequence — every tile is released. */
const RevealQueueContext = createContext<RevealQueue>({
  releasedCount: Number.POSITIVE_INFINITY,
  markSettled: () => { },
});

const RevealQueueProvider = ({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) => {
  const [releasedCount, setReleasedCount] = useState(0);
  const [isDraining, setIsDraining] = useState(false);
  const settledRef = useRef<Set<number>>(new Set());
  // Read by markSettled, which must stay stable as the queue drains.
  const releasedRef = useRef(0);
  // Bumped when the tile at the head of the queue settles, to wake the
  // scheduler below — the settled set itself is a ref and can't do that.
  const [headSettled, bumpHeadSettled] = useReducer((n: number) => n + 1, 0);

  const markSettled = useCallback((order: number) => {
    if (settledRef.current.has(order)) return;
    settledRef.current.add(order);
    // Anything behind the head is bookkeeping the scheduler reads on its turn;
    // only the head changes what happens next.
    if (order === releasedRef.current) bumpHeadSettled();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setIsDraining(true), REVEAL_GRACE_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    releasedRef.current = releasedCount;
    if (releasedCount >= count) return;
    // Nothing scheduled while the head is still loading: markSettled (or the
    // grace timer) re-runs this effect once there is something to release.
    if (!isDraining && !settledRef.current.has(releasedCount)) return;

    const id = setTimeout(() => setReleasedCount((n) => n + 1), REVEAL_PACE_MS);
    return () => clearTimeout(id);
  }, [releasedCount, count, isDraining, headSettled]);

  const value = useMemo(() => ({ releasedCount, markSettled }), [releasedCount, markSettled]);

  return <RevealQueueContext.Provider value={value}>{children}</RevealQueueContext.Provider>;
};

/* ─── Site Preview Card ─── */
interface SitePreviewCardProps {
  title: string;
  href: string;
  imgSrc: string;
  /** Fixed card height in px. Falls back to a 16:9 box when omitted. */
  height?: number;
  /** If true, uses a simpler opacity-only hover effect without overlays */
  isLandingPage?: boolean;
  /** Template id — enables the Download pill when provided. */
  templateId?: string;
  /** Above the fold: fetched eagerly and preloaded rather than lazily. */
  priority?: boolean;
  /** Fired once the cover has loaded or failed — drives the reveal queue. */
  onCoverSettled?: () => void;
}

const SitePreviewCard = ({
  title,
  href,
  imgSrc,
  height,
  isLandingPage,
  templateId,
  priority,
  onCoverSettled,
}: SitePreviewCardProps) => {
  // The cover fades in on decode instead of popping in: the tiles reveal on a
  // stagger, and a cover landing after its tile has settled reads as a glitch.
  const [isCoverLoaded, setIsCoverLoaded] = useState(false);

  const hasCover = Boolean(imgSrc && href);

  // A slot with no cover to wait for settles immediately, so it never holds
  // the reveal queue for the full grace period.
  useEffect(() => {
    if (!hasCover) onCoverSettled?.();
  }, [hasCover, onCoverSettled]);

  // Some registry entries are placeholders awaiting a deployed demo and cover
  // image (see the TODO in registry.ts) — render the empty slot rather than
  // asking next/image to fetch an empty src.
  if (!hasCover) {
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
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={priority}
          // Straight from the CDN, not through the image optimizer. These covers
          // are already WebP and 50-200 KB, so optimizing them buys almost
          // nothing — and costs a round trip to our own origin plus an AVIF
          // encode per image. Twelve of those on one screen is what made the
          // gallery slow to appear; served directly they come from Cloudflare.
          unoptimized
          onLoad={() => {
            setIsCoverLoaded(true);
            onCoverSettled?.();
          }}
          // A cover that never arrives still has to release the queue behind
          // it; the tile just reveals with its empty backing plate.
          onError={() => onCoverSettled?.()}
          className={`object-cover transition-opacity duration-500 ease-out ${isCoverLoaded ? "opacity-100" : "opacity-0"
            }`}
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
              {templateId && (
                <button
                  type="button"
                  onClick={(e) => {
                    // The card itself is the "open the demo" link — keep the pill
                    // from following it. A plain navigation rather than a nested
                    // <a>, which would be invalid inside that link; the response
                    // is an attachment, so the page stays where it is.
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.assign(
                      `/api/templates/${encodeURIComponent(templateId)}/download`,
                    );
                  }}
                  className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs px-4 py-1.5 rounded-[10px] font-medium hover:bg-black/60 transition-colors"
                >
                  Download
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </a>
  );
};

/**
 * One slot in a template grid: the reveal animation plus the card whose cover
 * releases it. Tile and card are one component because the queue needs both
 * ends — the load event comes from the card, the reveal from the wrapper.
 */
/** Covers on the first row are wanted immediately; the rest can wait. */
const EAGER_TILES = 3;

const RevealCard = ({ order, ...card }: { order: number } & SitePreviewCardProps) => {
  const reduceMotion = useReducedMotion();
  const { releasedCount, markSettled } = useContext(RevealQueueContext);
  const onCoverSettled = useCallback(() => markSettled(order), [markSettled, order]);

  // With reduced motion the tile appears where it lands, rather than rising
  // into place — the ordering is the point, the travel isn't.
  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 };
  const shown = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };

  return (
    <motion.div
      initial={hidden}
      animate={order < releasedCount ? shown : hidden}
      transition={{ duration: reduceMotion ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <SitePreviewCard {...card} priority={order < EAGER_TILES} onCoverSettled={onCoverSettled} />
    </motion.div>
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
  useCheckoutReturn();
  return (
    // overflow-x-clip: the grid backdrop is wider than the content box wherever
    // a classic scrollbar is present.
    <main className="relative min-h-screen bg-bg font-sans flex flex-col overflow-x-clip">
      <DashboardGrid />

      {/* Top Navigation — sticky, so the account menu and the Upgrade pill stay
          reachable once the templates grid is scrolled past. Opaque, not
          blurred: a backdrop-filter here would make the header the containing
          block for the fixed-position modals that UserControl renders, and
          they would centre themselves on the header rather than the viewport. */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-3 bg-bg">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Framerate" width={24} height={24} />
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
            both the fill and the border, per the design. Phones pull the side
            padding back to 16px, where 24px on top of the page gutter leaves
            the cards too narrow. */}
        <div className="w-full max-w-[1008px] mt-[100px] mb-12 rounded-[24px] border border-white-4 bg-white-4 px-4 py-6 md:p-6">
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
          <RevealQueueProvider count={Math.min(SITES.length, DASHBOARD_TEMPLATE_COUNT)}>
            {/* Source order is reading order here — the grid fills row by row,
                so the registry index is the cascade position unchanged. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {SITES.slice(0, DASHBOARD_TEMPLATE_COUNT).map((site, idx) => (
                <RevealCard
                  key={`${site.title}-${idx}`}
                  order={idx}
                  title={site.title}
                  href={site.href}
                  imgSrc={site.homescreenImgSrc}
                  templateId={site.id}
                />
              ))}
            </div>
          </RevealQueueProvider>
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
            <Image src="/logo.png" alt="Framerate" width={24} height={24} />
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
        {/* Both grids share one queue: only one of them is displayed at a time,
            so whichever is on screen is the one whose covers settle. */}
        <RevealQueueProvider count={Math.min(SITES.length, LANDING_TILE_COUNT)}>
          {/* Mobile: the templates as one vertical column, in source order. */}
          <div className="flex md:hidden flex-col gap-4">
            {SITES.slice(0, LANDING_TILE_COUNT).map((site, idx) => (
              <RevealCard
                key={site.id}
                order={idx}
                title={site.title}
                href={site.href}
                imgSrc={site.landingImgSrc}
                height={idx % 2 === 0 ? 238 : 189}
                isLandingPage
              />
            ))}
          </div>

          {/* Desktop: three explicit columns fed round-robin rather than a CSS
              `columns` masonry: the heights alternate tall/short within each
              column, so the columns stagger against each other. `slotIdx * 3 +
              col` undoes the round-robin, recovering each tile's registry index
              so the reveal still runs across the row rather than down a column. */}
          <div className="hidden md:flex md:flex-row gap-3">
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex-1 min-w-0 flex flex-col gap-3">
                {SITES
                  .filter((_, idx) => idx % 3 === col)
                  .slice(0, 4)
                  .map((site, slotIdx) => (
                    <RevealCard
                      key={site.id}
                      order={slotIdx * 3 + col}
                      title={site.title}
                      href={site.href}
                      imgSrc={site.landingImgSrc}
                      height={RIGHT_PANEL_TALL_PATTERN[col][slotIdx] ? 238 : 189}
                      isLandingPage
                    />
                  ))}
              </div>
            ))}
          </div>
        </RevealQueueProvider>
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

