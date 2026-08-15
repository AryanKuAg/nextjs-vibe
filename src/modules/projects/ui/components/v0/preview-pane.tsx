"use client";

import { useEffect, useRef, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";

/**
 * The live site.
 *
 * v0 gates previews behind an `x-v0-preview-token` header that an <iframe>
 * cannot send, so the frame points at our own `/api/v0-preview/:chatId` proxy,
 * which attaches it server-side. That also keeps the preview same-origin, which
 * is what makes the refresh and open-in-new-tab controls work at all.
 *
 * While v0 is still booting the sandbox the proxy serves a holding page that
 * retries every two seconds. That page announces itself with a postMessage, so
 * the spinner here stays up instead of the frame's `load` event being mistaken
 * for a finished site.
 */
export function PreviewPane({
  chatId,
  reloadKey = 0,
  onReadyChange,
}: {
  chatId: string;
  /** Bumped by the parent to force a reload after v0 changes the files. */
  reloadKey?: number;
  onReadyChange?: (ready: boolean) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const previewUrl = `/api/v0-preview/${encodeURIComponent(chatId)}?v=${reloadKey}`;

  useEffect(() => {
    setIsLoading(true);
    onReadyChange?.(false);
  }, [reloadKey, onReadyChange]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "v0-preview-loading") return;

      setIsLoading(true);
      onReadyChange?.(false);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onReadyChange]);

  return (
    <div className="relative h-full w-full">
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
          <Loader size={16} /> Starting preview…
        </div>
      ) : null}
      <iframe
        className="h-full w-full bg-background"
        key={reloadKey}
        onLoad={() => {
          // The holding page also fires `load`. Its postMessage arrives first
          // and immediately after, so a frame that is still waiting re-raises
          // the spinner rather than flashing the site as ready.
          setIsLoading(false);
          onReadyChange?.(true);
        }}
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={previewUrl}
        title="Site preview"
      />
    </div>
  );
}
