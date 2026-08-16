"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "@/lib/icons";

import { withChatToken } from "./chat-token";

/** How long a preview may stay unreachable before we stop implying progress. */
const STALLED_AFTER_MS = 45_000;

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
  reloadKey = 0,
  onNavigationChange,
}: {
  accessToken: string;
  chatId: string;
  /** False until v0 has finished a turn — there is nothing to preview yet. */
  hasBuild: boolean;
  /** Bumped by the parent to force a reload after v0 changes the files. */
  reloadKey?: number;
  onNavigationChange?: (navigation: PreviewNavigation | null) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [hasStalled, setHasStalled] = useState(false);
  const [manualReload, setManualReload] = useState(0);

  // Our own record of where the frame has been. The iframe's real history
  // cannot be inspected, and calling `history.back()` on a frame with nothing
  // behind it can walk the *parent* out of the builder — so Back is only ever
  // offered when this trail says there is somewhere to go.
  const [entries, setEntries] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  // Set while a reported path is the result of our own Back/Forward, so it
  // moves the cursor instead of truncating the trail and appending.
  const movingRef = useRef(false);

  const prefix = `/api/v0-preview/${encodeURIComponent(chatId)}`;
  const frameKey = `${reloadKey}-${manualReload}`;
  const previewUrl = withChatToken(`${prefix}?v=${frameKey}`, accessToken);

  useEffect(() => {
    setIsWaiting(true);
    setHasStalled(false);
    setEntries([]);
    setIndex(-1);
  }, [frameKey]);

  // Say something true when it takes too long, rather than spinning forever.
  useEffect(() => {
    if (!isWaiting) return;

    const timer = window.setTimeout(() => setHasStalled(true), STALLED_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [isWaiting, frameKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === "v0-preview-loading") {
        setIsWaiting(true);
        return;
      }

      if (event.data?.type !== "v0-preview-path") return;

      const reported: string = event.data.path ?? "/";
      // Strip the proxy prefix so the bar reads `/contact`, not the plumbing.
      const path = reported.startsWith(prefix) ? reported.slice(prefix.length) || "/" : reported;

      setEntries((current) => {
        if (movingRef.current) {
          movingRef.current = false;
          return current;
        }

        setIndex((currentIndex) => {
          if (current[currentIndex] === path) return currentIndex;
          return currentIndex + 1;
        });

        return current[current.length - 1] === path ? current : [...current, path];
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [prefix]);

  const go = useCallback((delta: number) => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;

    movingRef.current = true;
    setIndex((current) => current + delta);
    frame.history.go(delta);
  }, []);

  // Report upward so the header can render a real address bar.
  useEffect(() => {
    if (!onNavigationChange) return;

    const path = entries[index] ?? "/";
    onNavigationChange({
      path,
      canGoBack: index > 0,
      canGoForward: index >= 0 && index < entries.length - 1,
      back: () => go(-1),
      forward: () => go(1),
      externalUrl: withChatToken(
        `${prefix}${path === "/" ? "" : path}`,
        accessToken,
      ),
    });
  }, [accessToken, entries, go, index, onNavigationChange, prefix]);

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
        <p className="text-sm text-muted-foreground">Your site will be built here</p>
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
                v0 is still starting this site, or the last build did not finish. You can keep
                working in the chat — the code is on the Code tab.
              </p>
              <Button onClick={() => setManualReload((n) => n + 1)} size="sm" variant="outline">
                Try again
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Loader size={16} /> Starting preview…
            </span>
          )}
        </div>
      ) : null}

      <iframe
        className="h-full w-full bg-background"
        key={frameKey}
        onLoad={() => {
          // The holding page fires `load` too, but its postMessage arrives with
          // it and immediately after, so a frame that is still waiting puts the
          // overlay straight back up.
          setIsWaiting(false);
        }}
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={previewUrl}
        title="Site preview"
      />
    </div>
  );
}
