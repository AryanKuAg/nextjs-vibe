"use client";

import { useChat } from "@ai-sdk/react";
import {
  shouldResumeV0Chat,
  toV0UIMessage,
  toV0UIMessages,
  V0Transport,
  type Message,
  type V0UIMessage,
} from "@v0-sdk/react";
import { useMessages, useResolveTask, useRestoreMessage, useStopMessage } from "@v0-sdk/react/swr";
import { useEffect, useMemo, useState } from "react";
import { readV0Stream } from "v0/browser";

import { withChatToken } from "./chat-token";
import { ConversationView } from "./conversation-view";
import { PromptBox } from "./prompt-box";
import type { ResolveTask } from "./task-resolution";

/**
 * Drives one project's v0 chat.
 *
 * Every turn streams straight from `/api/v0/*` into `useChat`, so the transcript
 * you see is v0's live output rather than a summary written after the fact.
 * `resume` is what makes that survive a reload: a run started server-side (or
 * by a tab that has since closed) is picked back up mid-stream on mount.
 */
export function ChatConversation({
  accessToken,
  chatId,
  messages: initialMessages,
  onContentChange,
}: {
  /** Signed pass minted by `v0.workspace`; stands in for a Clerk session. */
  accessToken: string;
  chatId: string;
  messages: Message[];
  /** Fired when a turn finishes, so the preview and code panes refresh. */
  onContentChange: () => void;
}) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolvingMessageId, setResolvingMessageId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [restoringMessageId, setRestoringMessageId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const messagesUrl = withChatToken(
    `/api/v0/chats/${encodeURIComponent(chatId)}/messages`,
    accessToken,
  );
  // True while v0's newest turn is still unfinished.
  //
  // The first build is started server-side, so the browser joins it through
  // `resume` rather than having opened the stream itself. When that attach is
  // slow or the stream arrives buffered, nothing renders for a long stretch and
  // then the entire turn lands at once. Polling the transcript underneath is the
  // safety net: parts show up as v0 writes them either way. It costs one small
  // request every couple of seconds, and only while a run is actually open.
  const [hasPendingRun, setHasPendingRun] = useState(() => shouldResumeV0Chat(initialMessages));

  const messagesQuery = useMessages(
    messagesUrl,
    { limit: 100 },
    {
      fallbackData: { cursor: null, messages: initialMessages },
      revalidateOnMount: false,
      refreshInterval: hasPendingRun ? 2000 : 0,
    },
  );
  const persistedMessages = messagesQuery.data?.messages ?? initialMessages;

  useEffect(() => {
    const pending = shouldResumeV0Chat(persistedMessages);

    // A run that finished while nobody was watching. `onContentChange` normally
    // fires from `onFinish`, but a backgrounded tab throttles the stream and
    // that callback may never arrive — leaving the preview stuck on "your site
    // will be built here" until a manual reload. The poll sees the turn close
    // regardless, so it reports completion the same way the stream would.
    if (hasPendingRun && !pending) onContentChange();

    setHasPendingRun(pending);
  }, [hasPendingRun, onContentChange, persistedMessages]);

  const resolveTaskMutation = useResolveTask(
    withChatToken(`/api/v0/chats/${encodeURIComponent(chatId)}/resolve`, accessToken),
  );
  const restoreMessageMutation = useRestoreMessage(
    withChatToken(`/api/v0/chats/${encodeURIComponent(chatId)}/restore`, accessToken),
  );

  const initialUiMessages = useMemo(() => toV0UIMessages(initialMessages), [initialMessages]);
  const transport = useMemo(
    () =>
      new V0Transport({
        chatId,
        messages: persistedMessages,
        urls: {
          // Never reached: a chat only exists because `v0.startBuild` opened it
          // server-side, so the transport always has a chatId to send against.
          create: "/api/v0/chats",
          send: (id) =>
            withChatToken(`/api/v0/chats/${encodeURIComponent(id)}/messages`, accessToken),
          resume: (id) =>
            withChatToken(`/api/v0/chats/${encodeURIComponent(id)}/resume`, accessToken),
        },
      }),
    [accessToken, chatId, persistedMessages],
  );

  const {
    clearError,
    error: chatError,
    messages: uiMessages,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<V0UIMessage>({
    id: chatId,
    messages: initialUiMessages,
    resume: shouldResumeV0Chat(initialMessages),
    transport,
    onFinish: () => {
      onContentChange();
      void refreshMessages().catch((error) => {
        setActionError(errorMessage(error, "Failed to refresh messages."));
      });
    },
  });

  const chatIsBusy = status === "submitted" || status === "streaming";
  const activeAssistantMessage = resolvingMessageId
    ? uiMessages.find((message) => message.id === resolvingMessageId)
    : uiMessages.findLast(
        (message) => message.role === "assistant" && message.metadata?.finishReason == null,
      );

  const stopMessageMutation = useStopMessage(
    withChatToken(
      `/api/v0/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
        activeAssistantMessage?.id ?? "missing",
      )}/stop`,
      accessToken,
    ),
  );

  /**
   * Fold the polled transcript into what is on screen.
   *
   * Between turns this is a straight replace. Mid-turn it is not: overwriting a
   * streaming message with its half-written persisted copy makes it flicker, so
   * the polled copy is only adopted when it is strictly richer than what has
   * rendered. That is what rescues a stream which attached but has delivered
   * nothing — the symptom being a blank panel that suddenly fills in at the end
   * — while a healthy stream, always ahead of the poll, is left alone.
   */
  useEffect(() => {
    if (isResolving) return;

    const polled = toV0UIMessages(persistedMessages);

    if (!chatIsBusy) {
      setMessages(polled);
      return;
    }

    setMessages((current) => (countParts(polled) > countParts(current) ? polled : current));
  }, [chatIsBusy, isResolving, persistedMessages, setMessages]);

  const refreshMessages = async () => {
    if (!(await messagesQuery.mutate())) {
      throw new Error("Failed to refresh messages.");
    }
  };

  const submitMessage = async (message: string) => {
    setActionError(null);
    clearError();

    // No modelConfiguration is sent: the route pins v0 Mini regardless, and
    // passing one here would only imply the client gets a say.
    await sendMessage({ text: message });
  };

  const restoreMessage = async (messageId: string) => {
    setActionError(null);
    setRestoringMessageId(messageId);

    try {
      await restoreMessageMutation.trigger({ messageId });
      onContentChange();
      await refreshMessages();
    } catch (error) {
      setActionError(errorMessage(error, "Failed to restore message."));
    } finally {
      setRestoringMessageId(null);
    }
  };

  const resolveTask = async (task: ResolveTask) => {
    setActionError(null);
    clearError();
    setIsResolving(true);
    setResolvingMessageId(null);

    try {
      const response = await resolveTaskMutation.trigger({ task });
      const result = readV0Stream(response);

      for await (const update of result.stream) {
        if (!update.message) continue;

        const nextMessage = toV0UIMessage(update.message);
        setResolvingMessageId(nextMessage.id);
        setMessages((current) => upsertMessage(current, nextMessage));
      }

      onContentChange();
      await refreshMessages();
    } catch (error) {
      setActionError(errorMessage(error, "Failed to resolve task."));
      await refreshMessages().catch(() => undefined);
    } finally {
      setIsStopping(false);
      setIsResolving(false);
      setResolvingMessageId(null);
    }
  };

  const stopMessage = async () => {
    if (!activeAssistantMessage) return;

    setActionError(null);
    setIsStopping(true);

    try {
      await stopMessageMutation.trigger();
      await stop();
      onContentChange();
      await refreshMessages();
    } catch (error) {
      setActionError(errorMessage(error, "Failed to stop message."));
    } finally {
      setIsStopping(false);
    }
  };

  const isSubmitting = chatIsBusy || isResolving;
  const isStreaming =
    activeAssistantMessage !== undefined && (status === "streaming" || resolvingMessageId !== null);
  const error = actionError ?? chatError?.message;

  return (
    <>
      <ConversationView
        isStreaming={isStreaming}
        isWorking={isSubmitting || hasPendingRun}
        messages={uiMessages}
        onRejectPermission={() => submitMessage("Do not run this action. Continue without it.")}
        onResolveTask={resolveTask}
        onRestoreMessage={restoreMessage}
        restoringMessageId={restoringMessageId}
        taskDisabled={isSubmitting || restoringMessageId !== null}
      />
      <div className="shrink-0 px-3 pb-3">
        <PromptBox
          compact
          isStopping={isStopping}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting || restoringMessageId !== null}
          onStop={stopMessage}
          onSubmit={submitMessage}
          placeholder="Ask to make changes..."
        />
        {error ? <p className="mt-1.5 px-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </>
  );
}

/** How much of a transcript has actually rendered, used to pick the richer copy. */
function countParts(messages: V0UIMessage[]) {
  return messages.reduce((total, message) => total + message.parts.length, 0);
}

function upsertMessage(messages: V0UIMessage[], message: V0UIMessage) {
  const index = messages.findIndex((current) => current.id === message.id);
  if (index === -1) return [...messages, message];

  return messages.map((current, currentIndex) => (currentIndex === index ? message : current));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
