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
  chatId,
  messages: initialMessages,
  onContentChange,
}: {
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

  const messagesUrl = `/api/v0/chats/${encodeURIComponent(chatId)}/messages`;
  const messagesQuery = useMessages(
    messagesUrl,
    { limit: 100 },
    {
      fallbackData: { cursor: null, messages: initialMessages },
      revalidateOnMount: false,
    },
  );
  const persistedMessages = messagesQuery.data?.messages ?? initialMessages;

  const resolveTaskMutation = useResolveTask(`/api/v0/chats/${encodeURIComponent(chatId)}/resolve`);
  const restoreMessageMutation = useRestoreMessage(
    `/api/v0/chats/${encodeURIComponent(chatId)}/restore`,
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
          send: (id) => `/api/v0/chats/${encodeURIComponent(id)}/messages`,
          resume: (id) => `/api/v0/chats/${encodeURIComponent(id)}/resume`,
        },
      }),
    [chatId, persistedMessages],
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
    `/api/v0/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      activeAssistantMessage?.id ?? "missing",
    )}/stop`,
  );

  // Reconcile with the server transcript, but never mid-turn — overwriting a
  // streaming message with its half-written persisted copy makes it flicker.
  useEffect(() => {
    if (chatIsBusy || isResolving) return;

    setMessages(toV0UIMessages(persistedMessages));
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
          placeholder="Ask v0 to make changes..."
        />
        {error ? <p className="mt-1.5 px-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </>
  );
}

function upsertMessage(messages: V0UIMessage[], message: V0UIMessage) {
  const index = messages.findIndex((current) => current.id === message.id);
  if (index === -1) return [...messages, message];

  return messages.map((current, currentIndex) => (currentIndex === index ? message : current));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
