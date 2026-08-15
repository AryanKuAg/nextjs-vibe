"use client";

import { useDeployChat, useDownloadChatFiles } from "@v0-sdk/react/swr";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  DownloadIcon,
  ExternalIcon,
  EyeIcon,
  FullscreenCloseIcon,
  FullscreenIcon,
  RefreshIcon,
  SettingsIcon,
  SpinnerIcon,
  VercelLogoIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

export type ChatView = "preview" | "code";

export function ChatHeader({
  chatId,
  title,
  view,
  onViewChange,
  onReloadPreview,
  isFullscreen,
  onToggleFullscreen,
}: {
  chatId: string;
  title: string;
  view: ChatView;
  onViewChange: (view: ChatView) => void;
  onReloadPreview: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const deployChat = useDeployChat(`/api/v0/chats/${encodeURIComponent(chatId)}/deploy`);
  const downloadChat = useDownloadChatFiles(`/api/v0/chats/${encodeURIComponent(chatId)}/download`);
  const [publishState, setPublishState] = useState<"idle" | "published">("idle");
  const [error, setError] = useState<string | null>(null);

  const isPublishing = deployChat.isMutating;
  const isDownloading = downloadChat.isMutating;
  const previewUrl = `/api/v0-preview/${encodeURIComponent(chatId)}`;

  const publish = async () => {
    setError(null);

    try {
      await deployChat.trigger();
      // v0's deploy endpoint returns identifiers only — the Vercel build runs
      // asynchronously afterwards — so there is no URL to link to here.
      setPublishState("published");
    } catch (error) {
      setError(errorMessage(error, "Failed to publish."));
    }
  };

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
    <header className="flex h-12 shrink-0 items-center border-b border-border">
      <div
        className={cn(
          "flex w-full shrink-0 items-center gap-2 px-3 md:w-80 md:max-w-[42%]",
          isFullscreen && "md:w-auto md:max-w-none",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
      </div>

      <div className="hidden h-full min-w-0 flex-1 items-center justify-between gap-3 px-3 md:flex">
        <div className="flex shrink-0 items-center rounded-md bg-muted p-0.5">
          <Button
            aria-label="Preview"
            aria-pressed={view === "preview"}
            className={cn("size-6 rounded-sm p-0", view === "preview" && "bg-background shadow-xs")}
            onClick={() => onViewChange("preview")}
            size="icon-xs"
            variant="ghost"
          >
            <EyeIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Code"
            aria-pressed={view === "code"}
            className={cn("size-6 rounded-sm p-0", view === "code" && "bg-background shadow-xs")}
            onClick={() => onViewChange("code")}
            size="icon-xs"
            variant="ghost"
          >
            <CodeIcon className="size-3.5" />
          </Button>
        </div>

        <div className="hidden h-7 min-w-[150px] max-w-[420px] flex-1 items-center rounded-md border border-border px-0.5 lg:flex">
          <Button
            aria-label="Back"
            className="size-6 text-muted-foreground"
            disabled
            size="icon-xs"
            variant="ghost"
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Forward"
            className="size-6 text-muted-foreground"
            disabled
            size="icon-xs"
            variant="ghost"
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
          <span className="min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground">/</span>
          <Button
            aria-label="Refresh preview"
            className="size-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={onReloadPreview}
            size="icon-xs"
            title="Refresh preview"
            variant="ghost"
          >
            <RefreshIcon className="size-3.5" />
          </Button>
          <Button
            aria-label="Open preview in new tab"
            asChild
            className="size-6 p-0 text-muted-foreground hover:text-foreground"
            size="icon-xs"
            title="Open preview in new tab"
            variant="ghost"
          >
            <a href={previewUrl} rel="noreferrer" target="_blank">
              <ExternalIcon className="size-3.5" />
            </a>
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
            className="size-7"
            onClick={onToggleFullscreen}
            size="icon-sm"
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
            variant="ghost"
          >
            {isFullscreen ? (
              <FullscreenCloseIcon className="size-3.5" />
            ) : (
              <FullscreenIcon className="size-3.5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Project menu" className="size-7" size="icon-sm" variant="ghost">
                <SettingsIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isDownloading}
                onSelect={(event) => {
                  event.preventDefault();
                  void download();
                }}
              >
                {isDownloading ? (
                  <SpinnerIcon className="size-4 animate-spin" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                {isDownloading ? "Downloading" : "Download"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            aria-label={error ?? "Publish site"}
            className="h-7 min-w-[72px] gap-1.5 rounded-md px-2 text-xs"
            disabled={isPublishing}
            onClick={publish}
            size="sm"
            title={error ?? undefined}
          >
            {isPublishing ? (
              <SpinnerIcon className="size-3.5 animate-spin" />
            ) : (
              <VercelLogoIcon className="size-3.5" />
            )}
            {isPublishing ? "Publishing" : publishState === "published" ? "Published" : "Publish"}
          </Button>
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
