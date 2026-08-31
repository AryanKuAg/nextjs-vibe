"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalIcon,
  SpinnerIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

/** How long the copy button stays ticked before returning to the copy icon. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Publish, and the address it produced.
 *
 * The URL used to arrive in a toast, which is the one place it must not be:
 * toasts expire, and the address is the entire point of having published. So
 * it lives in a panel hanging off the button instead — copyable, openable, and
 * still there ten minutes later. A split control keeps the primary action one
 * click away: the label publishes, the chevron re-opens the address.
 */
export function PublishControl({
  projectId,
  publishedUrl,
}: {
  projectId: string;
  /** Where this project was last published, if it has been. */
  publishedUrl?: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  // The mutation's own answer, which is current before the workspace query has
  // caught up with it.
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const publish = useMutation(
    trpc.v0.publish.mutationOptions({
      onSuccess: async (result) => {
        setFreshUrl(result.url);
        setIsOpen(true);
        await queryClient.invalidateQueries(trpc.v0.workspace.queryOptions({ projectId }));
      },
      // A build failure is the user's own code failing, so the log is shown
      // rather than swallowed — it is the only thing that makes it fixable.
      onError: (error) =>
        toast.error("Could not publish", { description: error.message, duration: Infinity }),
    }),
  );

  const url = freshUrl ?? publishedUrl ?? null;
  const isPending = publish.isPending;

  const copy = async () => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setHasCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access is refused on insecure origins and by some policies.
      // The address is on screen and selectable, so say so rather than fail mute.
      toast.error("Could not copy — select the address and copy it by hand.");
    }
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen && Boolean(url)}>
      <PopoverAnchor asChild>
        <div className="flex h-7 items-stretch overflow-hidden rounded-[8px] border border-white-8 hover:bg-white-8 ">
          <button
            className="flex items-center justify-center gap-1.5 px-[8px] text-sm leading-[20px] font-medium text-white-85 transition-colors disabled:opacity-50 "
            disabled={isPending}
            onClick={() => publish.mutate({ projectId })}
            title={url ? "Build and put the newest version online" : "Build this site and put it online"}
            type="button"
          >
            {isPending ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
            {isPending ? "Publishing" : url ? "Republish" : "Publish"}
          </button>

          {/* Only worth showing once there is an address behind it. */}
          {url && !isPending ? (
            <button
              aria-expanded={isOpen}
              aria-label="Show the published address"
              className="flex w-7 items-center justify-center border-l border-white-12 text-white-85 transition-colors hover:bg-white-8"
              onClick={() => setIsOpen((current) => !current)}
              type="button"
            >
              <ChevronDownIcon
                className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        className="w-[288px] rounded-[12px] border border-white-8 bg-[#1e1e1e] p-3 shadow-xl"
        sideOffset={8}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="text-xs leading-[16px] font-medium text-white">Your site is live</span>
        </div>

        <div className="flex items-center gap-1 rounded-[8px] border border-white-8 bg-white-4 py-1 pl-2.5 pr-1">
          <span
            className="min-w-0 flex-1 truncate font-mono text-[11px] leading-[16px] text-white-85"
            title={url ?? undefined}
          >
            {displayUrl(url)}
          </span>
          <button
            aria-label={hasCopied ? "Copied" : "Copy address"}
            className="flex size-6 shrink-0 items-center justify-center rounded-[6px] text-white-50 transition-colors hover:bg-white-8 hover:text-white"
            onClick={() => void copy()}
            title={hasCopied ? "Copied" : "Copy address"}
            type="button"
          >
            {hasCopied ? (
              <CheckIcon className="size-3.5 text-emerald-400" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        </div>

        <a
          className="mt-2.5 flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-white text-sm leading-[20px] font-medium text-bg transition-colors hover:bg-white-85"
          href={url ?? "#"}
          rel="noreferrer"
          target="_blank"
        >
          Visit site
          <ExternalIcon className="size-3.5" />
        </a>
      </PopoverContent>
    </Popover>
  );
}

/** The address without its scheme — shorter, and nobody reads "https://". */
function displayUrl(url: string | null) {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
