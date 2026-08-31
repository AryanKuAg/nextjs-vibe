"use client";

import type { V0UIMessage } from "@v0-sdk/react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { RefreshIcon, SpinnerIcon } from "@/lib/icons";

import { MessageParts } from "./message-parts";
import { TaskResolution, type ResolveTask } from "./task-resolution";

/** How far from the bottom still counts as "following along". */
const PIN_THRESHOLD_PX = 48;

export function ConversationView({
  messages,
  isStreaming = false,
  isWorking = false,
  pendingUserMessage,
  footer,
  onRejectPermission,
  onResolveTask,
  onRestoreMessage,
  restoringMessageId,
  taskDisabled,
}: {
  messages: V0UIMessage[];
  isStreaming?: boolean;
  /** A turn is open, whether or not its first part has arrived yet. */
  isWorking?: boolean;
  pendingUserMessage?: string | null;
  /**
   * The composer, pinned to the foot of the transcript.
   *
   * It belongs inside the scroller rather than beside it: an overlay laid over
   * the scroller spans its full width, and its own background then paints over
   * the bottom of the scrollbar — which reads as the scrollbar being cut off
   * short of the window. In here it sits within the content box, inset by the
   * scrollbar's own gutter, so the bar stays visible all the way down.
   */
  footer?: ReactNode;
  onRejectPermission?: () => void | Promise<void>;
  onResolveTask?: (task: ResolveTask) => void | Promise<void>;
  onRestoreMessage?: (messageId: string) => void;
  restoringMessageId?: string | null;
  taskDisabled?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Whether the transcript should follow new content. Cleared the moment the
  // reader scrolls away from the bottom, so an arriving reply cannot drag them
  // back down mid-sentence.
  const isPinnedRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    isPinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX;
  }, []);

  const visibleMessages: V0UIMessage[] = pendingUserMessage
    ? [
        ...messages,
        {
          id: "pending-user-message",
          role: "user",
          parts: [{ type: "text", text: pendingUserMessage, state: "done" }],
        },
      ]
    : messages;

  // "Live" means a turn is open, which is not the same as the SSE reporting it.
  // When the stream has not attached and polling is carrying the transcript,
  // `isStreaming` is false while v0 is very much still working — keying the
  // shimmer off it left the newest step looking stuck.
  const isLive = isStreaming || isWorking;

  // Only the newest turn can still be answered — older cards are history, and
  // leaving them clickable would resolve a task v0 has already moved past.
  const interactiveTaskMessageId =
    isLive || pendingUserMessage ? null : visibleMessages.at(-1)?.id;
  const newestAssistantId = visibleMessages.findLast(
    (message) => message.role === "assistant",
  )?.id;
  // Markdown animation still follows the real stream; only the shimmer follows
  // "a turn is open", so prose does not animate off a two-second poll.
  const streamingMessageId = isStreaming ? newestAssistantId : null;
  const liveMessageId = isLive ? newestAssistantId : null;

  /**
   * Follow the tail of the transcript.
   *
   * A streaming reply rewrites `messages` on every token, so scrolling once per
   * change meant dozens of scroll writes a second — which on overlay-scrollbar
   * platforms flashes the scrollbar continuously, and elsewhere fights anyone
   * trying to read further up. Coalescing to a single write per frame keeps the
   * view pinned without the flicker, and the pin is dropped entirely once the
   * reader scrolls away.
   */
  useEffect(() => {
    if (!isPinnedRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;

    const frame = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isStreaming, isWorking, pendingUserMessage]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
      onScroll={handleScroll}
      ref={scrollerRef}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-3 pt-4 text-[14px] leading-[20px]">
        {visibleMessages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          visibleMessages.map((message) => (
            <ConversationMessage
              isLive={liveMessageId === message.id}
              isRestoring={restoringMessageId === message.id}
              isStreaming={streamingMessageId === message.id}
              key={message.id}
              message={message}
              onRejectPermission={
                message.id === interactiveTaskMessageId ? onRejectPermission : undefined
              }
              onResolveTask={message.id === interactiveTaskMessageId ? onResolveTask : undefined}
              onRestore={onRestoreMessage}
              taskDisabled={taskDisabled}
            />
          ))
        )}
        {/* v0 can take a while to emit its first part. Without this the panel
            sits empty after the user's message and the build looks stalled. */}
        {isWorking && visibleMessages.at(-1)?.role !== "assistant" ? (
          <p className="shimmer-text py-0.5 text-xs leading-[16px] font-medium">Working on it…</p>
        ) : null}
        {/* `mt-auto` puts it at the bottom when the transcript is too short
            to fill the pane; `sticky` holds it there once the transcript is
            long enough to scroll. Taking real space at the end of the content
            means the last message can never come to rest underneath it. */}
        {footer ? (
          <div className="sticky bottom-0 -mx-3 mt-auto bg-bg px-3 pt-2 pb-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function ConversationMessage({
  message,
  onRejectPermission,
  onResolveTask,
  onRestore,
  isLive = false,
  isRestoring = false,
  isStreaming = false,
  taskDisabled = false,
}: {
  message: V0UIMessage;
  onRejectPermission?: () => void | Promise<void>;
  onResolveTask?: (task: ResolveTask) => void | Promise<void>;
  onRestore?: (messageId: string) => void;
  isLive?: boolean;
  isRestoring?: boolean;
  isStreaming?: boolean;
  taskDisabled?: boolean;
}) {
  const content = (
    <Message from={message.role}>
      <MessageContent
        className={
          message.role === "user"
            ? "gap-2 group-[.is-user]:max-w-[86%] group-[.is-user]:rounded-[12px] group-[.is-user]:border-0 group-[.is-user]:bg-white-8 group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-[14px] group-[.is-user]:leading-[20px] group-[.is-user]:text-white"
            : "w-full text-[14px] leading-[20px] text-white"
        }
      >
        <MessageParts isLive={isLive} isStreaming={isStreaming} message={message} />
        {onResolveTask && onRejectPermission ? (
          <TaskResolution
            disabled={taskDisabled}
            message={message}
            onRejectPermission={onRejectPermission}
            onResolve={onResolveTask}
          />
        ) : null}
      </MessageContent>
    </Message>
  );

  if (!message.metadata?.restorable || !onRestore) return content;

  return (
    <div className="flex flex-col items-start">
      {content}
      <button
        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        disabled={isRestoring}
        onClick={() => onRestore(message.id)}
        type="button"
      >
        {isRestoring ? (
          <SpinnerIcon className="size-3 animate-spin" />
        ) : (
          <RefreshIcon className="size-3" />
        )}
        {isRestoring ? "Rewinding…" : "Rewind chat to here"}
      </button>
    </div>
  );
}
