"use client";

import type { Chat, Message } from "@v0-sdk/react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ChatConversation } from "./chat-conversation";
import { ChatHeader, type ChatView } from "./chat-header";
import { CodeEditor } from "./code-editor";
import { PreviewPane } from "./preview-pane";

/**
 * The builder: conversation on the left, preview or code on the right.
 *
 * `contentRevision` is the hinge between the two halves — when a turn finishes,
 * bumping it remounts the preview and refetches the files, which is how the
 * right-hand side learns that v0 changed something without polling for it.
 */
export function ChatWorkspace({
  chat,
  messages,
  title,
  toolbar,
}: {
  chat: Chat;
  messages: Message[];
  title: string;
  /** Rendered at the top of the conversation column (project header, credits). */
  toolbar?: ReactNode;
}) {
  const [view, setView] = useState<ChatView>("preview");
  const [contentRevision, setContentRevision] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);

  // The conversation column is hidden with CSS rather than unmounted: taking it
  // down would tear the streaming connection out from under an in-flight build.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const handleContentChange = () => {
    setIsPreviewReady(false);
    setContentRevision((revision) => revision + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        chatId={chat.id}
        isFullscreen={isFullscreen}
        onReloadPreview={handleContentChange}
        onToggleFullscreen={() => setIsFullscreen((current) => !current)}
        onViewChange={setView}
        title={title}
        view={view}
      />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex w-full shrink-0 flex-col border-r border-border md:w-96 md:max-w-[42%]",
            isFullscreen && "hidden",
          )}
        >
          {toolbar}
          <ChatConversation
            chatId={chat.id}
            messages={messages}
            onContentChange={handleContentChange}
          />
        </div>

        <div className={cn("hidden min-w-0 flex-1 md:block", isFullscreen && "block")}>
          <div className={view === "preview" ? "h-full" : "hidden"}>
            <PreviewPane
              chatId={chat.id}
              onReadyChange={setIsPreviewReady}
              reloadKey={contentRevision}
            />
          </div>
          <div className={view === "code" ? "h-full" : "hidden"}>
            <CodeEditor
              chatId={chat.id}
              isPreviewReady={isPreviewReady}
              revision={contentRevision}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
