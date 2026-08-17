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
  openingPrompt,
  previewOrigin,
  projectId,
  publishedUrl,
  title,
  toolbar,
  accessToken,
}: {
  chat: Chat;
  messages: Message[];
  /** The user's own brief, shown instead of the composed opening message. */
  openingPrompt?: string | null;
  projectId: string;
  /** Verified preview hostname for this chat, or null for the path proxy. */
  previewOrigin?: string | null;
  /** Where this project was last published, if it has been. */
  publishedUrl?: string | null;
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
  // Whether v0 has a turn open, so the preview can say "building" rather than
  // accusing the site of having failed.
  const [isBuilding, setIsBuilding] = useState(false);
  const handleBusyChange = useCallback(setIsBuilding, [setIsBuilding]);

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

  // Stable identity: the conversation calls this from an effect, so a fresh
  // function each render would re-run that effect on every render.
  const handleContentChange = useCallback(() => {
    setHasBuild(true);
    setContentRevision((revision) => revision + 1);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        accessToken={accessToken}
        chatId={chat.id}
        navigation={navigation}
        projectId={projectId}
        publishedUrl={publishedUrl}
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
            onBusyChange={handleBusyChange}
            onContentChange={handleContentChange}
            openingPrompt={openingPrompt}
          />
        </div>

        <div className={cn("hidden min-w-0 flex-1 md:block", isFullscreen && "block")}>
          <div className={view === "preview" ? "h-full" : "hidden"}>
            <PreviewPane
              accessToken={accessToken}
              chatId={chat.id}
              hasBuild={hasBuild}
              isBuilding={isBuilding}
              onNavigationChange={handleNavigationChange}
              previewOrigin={previewOrigin}
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
