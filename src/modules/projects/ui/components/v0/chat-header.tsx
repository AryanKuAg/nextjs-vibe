"use client";

import { useDownloadChatFiles } from "@v0-sdk/react/swr";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  CodeIcon,
  DownloadIcon,
  EyeIcon,
  FullscreenCloseIcon,
  FullscreenIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

import { withChatToken } from "./chat-token";

export type ChatView = "preview" | "code";

/** The three plain actions and both halves of the view toggle share one shape. */
const ICON_BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-white-4 text-white-85 transition-colors hover:bg-white-8 disabled:opacity-50";

/**
 * The builder's single top bar.
 *
 * Left of the pane divider it carries the project's identity (logo, name);
 * right of it, the controls for whatever the preview is showing, then Publish
 * and the account menu. It was two stacked bars until the design collapsed
 * them into one, which is why `titleSlot` and `accountSlot` are passed in
 * rather than rendered here — both need data this component does not have.
 */
export function ChatHeader({
  accessToken,
  chatId,
  projectId,
  publishedUrl,
  title,
  titleSlot,
  accountSlot,
  view,
  onViewChange,
  onReloadPreview,
  isFullscreen,
  onToggleFullscreen,
}: {
  /** Signed pass minted by `v0.workspace`; stands in for a Clerk session. */
  accessToken: string;
  chatId: string;
  projectId: string;
  /** Where this project was last published, if it has been. */
  publishedUrl?: string | null;
  /** Used to name the downloaded zip. */
  title: string;
  /** Logo and the editable project name, in the column-width left segment. */
  titleSlot?: ReactNode;
  /** The avatar menu, at the far right. */
  accountSlot?: ReactNode;
  view: ChatView;
  onViewChange: (view: ChatView) => void;
  onReloadPreview: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const downloadChat = useDownloadChatFiles(
    withChatToken(`/api/v0/chats/${encodeURIComponent(chatId)}/download`, accessToken),
  );
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const publish = useMutation(
    trpc.v0.publish.mutationOptions({
      onSuccess: async (result) => {
        toast.success("Published", {
          description: result.url,
          action: { label: "Open", onClick: () => window.open(result.url, "_blank") },
        });
        await queryClient.invalidateQueries(trpc.v0.workspace.queryOptions({ projectId }));
      },
      // A build failure is the user's own code failing, so the log is shown
      // rather than swallowed — it is the only thing that makes it fixable.
      onError: (mutationError) =>
        toast.error("Could not publish", {
          description: mutationError.message,
          duration: Infinity,
        }),
    }),
  );

  const isDownloading = downloadChat.isMutating;

  const download = async () => {
    setError(null);

    try {
      const blob = await downloadChat.trigger();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName(title || chatId)}.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setError(errorMessage(error, "Failed to download."));
    }
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center border-b border-border">
      <div
        className={cn(
          "flex w-full shrink-0 items-center gap-3 px-3 md:w-96 md:max-w-[42%]",
          isFullscreen && "md:w-auto md:max-w-none",
        )}
      >
        {titleSlot}
      </div>

      <div className="hidden h-full min-w-0 flex-1 items-center gap-2.5 px-3 md:flex">
        <div className="flex shrink-0 items-center gap-0.5 rounded-[8px] bg-white-4 p-0.5">
          <button
            aria-label="Preview"
            aria-pressed={view === "preview"}
            className={cn(
              "flex size-6 items-center justify-center rounded-[6px] transition-colors",
              view === "preview" ? "bg-white-12 text-white" : "text-white-50 hover:text-white-85",
            )}
            onClick={() => onViewChange("preview")}
            type="button"
          >
            <EyeIcon className="size-3.5" />
          </button>
          <button
            aria-label="Code"
            aria-pressed={view === "code"}
            className={cn(
              "flex size-6 items-center justify-center rounded-[6px] transition-colors",
              view === "code" ? "bg-white-12 text-white" : "text-white-50 hover:text-white-85",
            )}
            onClick={() => onViewChange("code")}
            type="button"
          >
            <CodeIcon className="size-3.5" />
          </button>
        </div>

        <button
          aria-label="Refresh preview"
          className={ICON_BUTTON}
          onClick={onReloadPreview}
          title="Refresh preview"
          type="button"
        >
          <RefreshIcon className="size-3.5" />
        </button>

        <button
          aria-label="Download"
          className={ICON_BUTTON}
          disabled={isDownloading}
          onClick={() => void download()}
          // Download is the only action here that can fail visibly; the message
          // rides on the control that produced it.
          title={error ?? (isDownloading ? "Downloading" : "Download")}
          type="button"
        >
          {isDownloading ? (
            <SpinnerIcon className="size-3.5 animate-spin" />
          ) : (
            <DownloadIcon className="size-3.5" />
          )}
        </button>

        <button
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
          className={ICON_BUTTON}
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          type="button"
        >
          {isFullscreen ? (
            <FullscreenCloseIcon className="size-3.5" />
          ) : (
            <FullscreenIcon className="size-3.5" />
          )}
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button
            className="flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-white-12 px-[14px] text-sm leading-[20px] font-medium text-white-85 transition-colors hover:bg-white-8 disabled:opacity-50"
            disabled={publish.isPending}
            onClick={() => publish.mutate({ projectId })}
            title="Build this site and put it online"
            type="button"
          >
            {publish.isPending ? <SpinnerIcon className="size-3.5 animate-spin" /> : null}
            {publish.isPending ? "Publishing" : publishedUrl ? "Republish" : "Publish"}
          </button>
          {accountSlot}
        </div>
      </div>
    </header>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function fileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "site"
  );
}
