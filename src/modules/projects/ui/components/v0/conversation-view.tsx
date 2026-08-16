"use client";

import type { V0UIMessage } from "@v0-sdk/react";
import { useEffect, useRef } from "react";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { RefreshIcon, SpinnerIcon } from "@/lib/icons";

import { MessageParts } from "./message-parts";
import { TaskResolution, type ResolveTask } from "./task-resolution";

export function ConversationView({
  messages,
  isStreaming = false,
  isWorking = false,
  pendingUserMessage,
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
  onRejectPermission?: () => void | Promise<void>;
  onResolveTask?: (task: ResolveTask) => void | Promise<void>;
  onRestoreMessage?: (messageId: string) => void;
  restoringMessageId?: string | null;
  taskDisabled?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isStreaming, pendingUserMessage]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 text-[13px] leading-relaxed">
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
          <p className="shimmer-text py-0.5 text-xs font-medium">Working on it…</p>
        ) : null}
        <div ref={endRef} />
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
            ? "group-[.is-user]:max-w-[80%] group-[.is-user]:rounded-2xl group-[.is-user]:border group-[.is-user]:border-border group-[.is-user]:bg-muted group-[.is-user]:px-3 group-[.is-user]:py-1.5 group-[.is-user]:text-[13px]"
            : "w-full text-[13px] leading-relaxed"
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
