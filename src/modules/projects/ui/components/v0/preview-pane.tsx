"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "@/lib/icons";

import { withChatToken } from "./chat-token";

/** How long a preview may stay unreachable before we stop implying progress. */
const STALLED_AFTER_MS = 45_000;

/**
 * How long a page inside the preview has to load before we assume it did not.
 *
 * A navigation that fails — a refused connection, a host that does not resolve —
 * leaves the browser's own error page in the frame, which we cannot read across
 * origins and which never reports back. Without this the builder would sit there
 * showing that error as if it were the user's site.
 */
const NAVIGATION_TIMEOUT_MS = 6_000;

/** What the header's address bar needs to stop being decorative. */
export type PreviewNavigation = {
  /** Path within the previewed site, e.g. `/contact`. */
  path: string;
  canGoBack: boolean;
  canGoForward: boolean;
  back: () => void;
  forward: () => void;
  /** Same page, addressable from outside the builder. */
  externalUrl: string;
};

/**
 * The live site.
 *
 * v0 gates previews behind an `x-v0-preview-token` header that an <iframe>
 * cannot send, so the frame points at our own `/api/v0-preview/:chatId` proxy,
 * which attaches it server-side and keeps the preview same-origin.
 *
 * Same-origin is also what makes the address bar work: the framed page reports
 * its location by postMessage, and this keeps the trail so Back and Forward can
 * move through it.
 */
export function PreviewPane({
  accessToken,
  chatId,
  hasBuild,
  isBuilding = false,
  previewOrigin = null,
  reloadKey = 0,
  onNavigationChange,
}: {
  accessToken: string;
  chatId: string;
  /**
   * The origin to frame, when the deployment has a working preview hostname.
   * Decided on the server, which checks the DNS record actually exists — so
   * this is never a hostname the browser will fail to resolve.
   */
  previewOrigin?: string | null;
  /** False until v0 has finished a turn — there is nothing to preview yet. */
  hasBuild: boolean;
  /** A turn is open right now, so the preview is expected to be behind. */
  isBuilding?: boolean;
  /** Bumped by the parent to force a reload after v0 changes the files. */
  reloadKey?: number;
  onNavigationChange?: (navigation: PreviewNavigation | null) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [hasStalled, setHasStalled] = useState(false);
  /** Shown only once a click has demonstrably failed to load anything. */
  const [deadLink, setDeadLink] = useState<string | null>(null);
  /** The click we are still waiting on. Cleared the moment the page reports in. */
  const pendingNavRef = useRef<string | null>(null);
  const [manualReload, setManualReload] = useState(0);

  // Our own record of where the frame has been. The iframe's real history
  // cannot be inspected, and calling `history.back()` on a frame with nothing
  // behind it can walk the *parent* out of the builder — so Back is only ever
  // offered when this trail says there is somewhere to go.
  // Entries and cursor move together, as one value. They were two states, and
  // the cursor was updated from inside the entries updater — a setState within
  // another setState's updater, which React may run more than once. That is
  // what produced "Maximum update depth exceeded".
  const [history, setHistory] = useState<{ entries: string[]; index: number }>({
    entries: [],
    index: -1,
  });
  // Set while a reported path is the result of our own Back/Forward, so it
  // moves the cursor instead of truncating the trail and appending.
  const movingRef = useRef(false);

  // Its own origin when the deployment has one, otherwise this app's under a
  // path prefix. Everything downstream keys off which of the two it is.
  const origin = previewOrigin;
  const prefix = origin ? "" : `/api/v0-preview/${encodeURIComponent(chatId)}`;
  const base = origin ? `${origin}/` : prefix;

  const frameKey = `${reloadKey}-${manualReload}`;
  const previewUrl = withChatToken(`${base}?v=${frameKey}`, accessToken);

  useEffect(() => {
    setIsWaiting(true);
    setHasStalled(false);
    setHistory({ entries: [], index: -1 });
  }, [frameKey]);

  // Say something true when it takes too long, rather than spinning forever.
  // Not while a turn is open, though: v0 rebuilding is the expected reason for
  // a preview to be down, and calling that a stall told the user their site had
  // failed while it was busy succeeding.
  useEffect(() => {
    if (!isWaiting || isBuilding) return;

    const timer = window.setTimeout(() => setHasStalled(true), STALLED_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [frameKey, isBuilding, isWaiting]);

  // A new turn means whatever the last one was, it is moot now.
  useEffect(() => {
    if (isBuilding) setHasStalled(false);
  }, [isBuilding]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // The frame may be on its own origin now, so identity comes from the
      // window it was sent by rather than from matching our own origin.
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (origin ? event.origin !== origin : event.origin !== window.location.origin) return;

      if (event.data?.type === "v0-preview-loading") {
        setIsWaiting(true);
        return;
      }

      // A link was clicked. Nothing is wrong yet — but if the page it leads to
      // never reports back, that navigation failed and the frame is sitting on
      // a browser error page we cannot read across origins.
      if (event.data?.type === "v0-preview-navigate") {
        const href = String(event.data.href ?? "");
        pendingNavRef.current = href;

        window.setTimeout(() => {
          if (pendingNavRef.current !== href) return; // it arrived
          console.warn(`[v0] preview navigation did not load: ${href}`);
          setDeadLink(href);
        }, NAVIGATION_TIMEOUT_MS);
        return;
      }

      if (event.data?.type !== "v0-preview-path") return;

      // The frame answered, so it is genuinely our proxy's page and safe to
      // reveal. `load` alone is not proof: it fires for the browser's own DNS
      // error page too, which is how a dead hostname ended up on screen.
      setIsWaiting(false);
      // The page reported in, so the click that led here worked.
      pendingNavRef.current = null;
      setDeadLink(null);

      // Ours, not the site's: a cache-buster and an access pass. Showing them
      // in the address bar turned `/` into `?v=3-0-path&t=user_3H7Y…`.
      const path = sitePath(event.data.path ?? "/", prefix);

      setHistory((current) => {
        // Our own Back/Forward: the cursor already moved, so this report is
        // just the frame confirming where it landed.
        if (movingRef.current) {
          movingRef.current = false;
          return current;
        }

        if (current.entries[current.index] === path) return current;

        // A new destination truncates anything ahead of the cursor, exactly as
        // a browser's own history does.
        const entries = [...current.entries.slice(0, current.index + 1), path];
        return { entries, index: entries.length - 1 };
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, prefix]);

  const go = useCallback(
    (delta: number) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;

      movingRef.current = true;
      setHistory((current) => ({ ...current, index: current.index + delta }));
      // Asked for rather than reached for: on its own host the frame is another
      // origin, and touching its `history` directly would throw.
      frame.postMessage({ type: "v0-preview-go", delta }, origin ?? window.location.origin);
    },
    [origin],
  );

  // Report upward so the header can render a real address bar.
  useEffect(() => {
    if (!onNavigationChange) return;

    const path = history.entries[history.index] ?? "/";
    onNavigationChange({
      path,
      canGoBack: history.index > 0,
      canGoForward: history.index >= 0 && history.index < history.entries.length - 1,
      back: () => go(-1),
      forward: () => go(1),
      externalUrl: withChatToken(
        origin ? `${origin}${path}` : `${prefix}${path === "/" ? "" : path}`,
        accessToken,
      ),
    });
  }, [accessToken, go, history, onNavigationChange, origin, prefix]);

  useEffect(() => {
    return () => onNavigationChange?.(null);
  }, [onNavigationChange]);

  // Nothing has been built yet. No iframe either — pointing it at the proxy
  // now would just bounce off the holding page every two seconds for the whole
  // length of the first build, and a spinner would promise something imminent
  // when the work has barely started.
  if (!hasBuild) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-white-50">Your website will preview here</p>
      </div>
    );
  }

  if (deadLink) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <EyeIcon className="size-5 text-muted-foreground opacity-60" />
        <p className="text-sm font-medium text-foreground">That page didn&rsquo;t load</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The preview tried to open{" "}
          <span className="font-mono break-all text-white-85">{deadLink}</span> and the browser
          could not reach it.
        </p>
        <Button
          onClick={() => {
            pendingNavRef.current = null;
            setDeadLink(null);
            setManualReload((n) => n + 1);
          }}
          size="sm"
          variant="outline"
        >
          Back to the preview
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isWaiting ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center text-sm text-muted-foreground">
          {hasStalled ? (
            <>
              <EyeIcon className="size-5 opacity-60" />
              <p className="font-medium text-foreground">Preview isn&rsquo;t up yet</p>
              <p className="max-w-xs text-xs">
                This site is still starting, or the last build did not finish. You can keep
                working in the chat — the code is on the Code tab.
              </p>
              <Button onClick={() => setManualReload((n) => n + 1)} size="sm" variant="outline">
                Try again
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Loader size={16} /> {isBuilding ? "Building your site…" : "Starting preview…"}
            </span>
          )}
        </div>
      ) : null}

      <iframe
        className="h-full w-full bg-background"
        key={frameKey}
        // Deliberately no `onLoad` reveal: the overlay lifts when the framed
        // page reports its path, which only our proxy's HTML does. A browser
        // error page fires `load` just as happily and would be shown to the
        // user as if it were their site.
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={previewUrl}
        title="Site preview"
      />
    </div>
  );
}

/**
 * The path as the previewed site sees it: our proxy prefix removed, and our own
 * query parameters stripped so the address bar shows the site's URL, not ours.
 */
function sitePath(reported: string, prefix: string): string {
  const withoutPrefix =
    prefix && reported.startsWith(prefix) ? reported.slice(prefix.length) : reported;

  const [pathname, query = ""] = withoutPrefix.split("?");
  const params = new URLSearchParams(query);
  params.delete("v");
  params.delete("t");

  const rest = params.toString();
  return `${pathname || "/"}${rest ? `?${rest}` : ""}`;
}
