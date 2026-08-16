"use client";

import { toV0UIMessages, type Chat, type Message } from "@v0-sdk/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ChatConversation } from "./chat-conversation";
import { ChatHeader, type ChatView } from "./chat-header";
import { CodeViewer } from "./code-editor";
import { PreviewPane, type PreviewNavigation } from "./preview-pane";

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
  accessToken,
}: {
  chat: Chat;
  messages: Message[];
  title: string;
  /** Signed pass minted by `v0.workspace`; stands in for a Clerk session. */
  accessToken: string;
  /** Rendered at the top of the conversation column (project header, credits). */
  toolbar?: ReactNode;
}) {
  const [view, setView] = useState<ChatView>("preview");
  const [contentRevision, setContentRevision] = useState(0);
  // Lifted out of the preview so the header's address bar can show where the
  // framed site actually is, and move through its history.
  const [navigation, setNavigation] = useState<PreviewNavigation | null>(null);
  const handleNavigationChange = useCallback(setNavigation, [setNavigation]);

  // Whether v0 has ever finished a turn for this chat. Before that there is no
  // site to preview and no sandbox to wait on, so the pane says so plainly
  // instead of spinning at a build that has not produced anything yet.
  const [hasBuild, setHasBuild] = useState(() =>
    toV0UIMessages(messages).some(
      (message) => message.role === "assistant" && message.metadata?.finishReason != null,
    ),
  );

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
    setHasBuild(true);
    setContentRevision((revision) => revision + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        accessToken={accessToken}
        chatId={chat.id}
        navigation={navigation}
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
            accessToken={accessToken}
            chatId={chat.id}
            messages={messages}
            onContentChange={handleContentChange}
          />
        </div>

        <div className={cn("hidden min-w-0 flex-1 md:block", isFullscreen && "block")}>
          <div className={view === "preview" ? "h-full" : "hidden"}>
            <PreviewPane
              accessToken={accessToken}
              chatId={chat.id}
              hasBuild={hasBuild}
              onNavigationChange={handleNavigationChange}
              reloadKey={contentRevision}
            />
          </div>
          <div className={view === "code" ? "h-full" : "hidden"}>
            <CodeViewer accessToken={accessToken} chatId={chat.id} revision={contentRevision} />
          </div>
        </div>
      </div>
    </div>
  );
}
