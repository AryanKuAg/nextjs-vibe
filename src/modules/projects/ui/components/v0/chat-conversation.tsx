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

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";

import { withChatToken } from "./chat-token";
import { ConversationView } from "./conversation-view";
import { PromptBox } from "./prompt-box";
import type { ResolveTask } from "./task-resolution";

/**
 * How long a run may show no progress before the builder stops believing in it.
 *
 * v0 runs do hang: the assistant message stays open, `updatedAt` never advances
 * and no content ever arrives, so `/files` answers 409 and the preview never
 * boots. Nothing on our side is wrong when that happens — but the transcript
 * polls forever, the composer stays locked because a turn is open, and the stop
 * button is hidden because `isStreaming` is false (the stream is exactly what
 * is not delivering). The user is left with a spinner and no way out. This is
 * how long we wait before offering one.
 */
const STALLED_AFTER_MS = 3 * 60 * 1000;

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
  openingPrompt,
  onContentChange,
  onBusyChange,
}: {
  /** Signed pass minted by `v0.workspace`; stands in for a Clerk session. */
  accessToken: string;
  chatId: string;
  messages: Message[];
  /** The user's own words, shown instead of the composed opening message. */
  openingPrompt?: string | null;
  /** Fired when a turn finishes, so the preview and code panes refresh. */
  onContentChange: () => void;
  /** Whether a turn is currently open, for the panes that show progress. */
  onBusyChange?: (busy: boolean) => void;
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
  // Whether that open run has gone quiet. Reset by any real movement in the
  // transcript, so a slow-but-live build never trips it.
  const [hasStalled, setHasStalled] = useState(false);

  // Memoised deliberately. An object literal here is a new value on every
  // render, so SWR hands back fresh `data`, the effects below see changed
  // input, they setState, and that renders again — "Maximum update depth
  // exceeded", on a loop that never settles.
  const fallbackData = useMemo(
    () => ({ cursor: null, messages: initialMessages }),
    [initialMessages],
  );

  const messagesQuery = useMessages(
    messagesUrl,
    { limit: 100 },
    {
      fallbackData,
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

  // Fingerprinted on content rather than identity: the poll returns a fresh
  // object every two seconds whether or not v0 has done anything, and resetting
  // the clock on that would mean it never fires.
  const transcriptMark = persistedMessages
    .map((message) => `${message.id}:${message.updatedAt?.valueOf() ?? ""}`)
    .join("|");

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
    setActionError(null);
    // The banner that is on screen is usually from the run being abandoned, and
    // it survives until something clears it — leaving red text over a chat that
    // is working again.
    clearError();
    setIsStopping(true);
    setHasStalled(false);

    try {
      // A hung run may have no message we can name — the assistant turn exists
      // on v0's side but nothing about it ever reached the transcript. Stopping
      // is still worth attempting; refreshing afterwards is what unblocks the
      // composer either way, because it is `hasPendingRun` that locks it.
      if (activeAssistantMessage) await stopMessageMutation.trigger();
      await stop();
      onContentChange();
      await refreshMessages();
    } catch (error) {
      setActionError(errorMessage(error, "Failed to stop message."));
      await refreshMessages().catch(() => undefined);
    } finally {
      setIsStopping(false);
    }
  };

  const isSubmitting = chatIsBusy || isResolving;

  // Keyed on the composer being locked, not just on v0 having an open run.
  //
  // Those are different, and the difference is what left a build unrecoverable:
  // `status` describes OUR stream and `hasPendingRun` describes v0's. When a
  // resumed stream attaches to a run that then ends — v0 stopping early on its
  // output limit, say — status stays "submitted" for good, the textarea stays
  // disabled, and the earlier version of this check saw hasPendingRun go false
  // and offered nothing. Locked box, no button, no explanation.
  useEffect(() => {
    setHasStalled(false);
    if (!isSubmitting && !hasPendingRun) return;

    const timer = window.setTimeout(() => setHasStalled(true), STALLED_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [hasPendingRun, isSubmitting, transcriptMark]);

  useEffect(() => {
    onBusyChange?.(isSubmitting || hasPendingRun);
  }, [hasPendingRun, isSubmitting, onBusyChange]);
  /**
   * A turn that ended without doing the work.
   *
   * v0 sometimes stops on its own output limit part-way through planning: the
   * message closes with finishReason "length", no files are written, and the
   * preview shows v0's own "your generation will show here" placeholder. From
   * the outside that is indistinguishable from our build being broken, and the
   * transcript simply stops with no explanation. Naming it, and saying what
   * unsticks it, is the difference between a dead project and a follow-up.
   */
  const abandonedTurn =
    !isSubmitting &&
    !hasPendingRun &&
    uiMessages.findLast((message) => message.role === "assistant")?.metadata?.finishReason ===
      "length";

  const isStreaming =
    activeAssistantMessage !== undefined && (status === "streaming" || resolvingMessageId !== null);
  const error = actionError ?? chatError?.message;

  // Only what is drawn. `uiMessages` is left exactly as v0 has it, because it is
  // also what the transport replays and what every id and index here refers to;
  // rewriting it at the source would put our display copy back into the chat.
  const visibleMessages = useMemo(
    () => withOriginalPrompt(uiMessages, openingPrompt),
    [openingPrompt, uiMessages],
  );

  return (
    <>
      <ConversationView
        isStreaming={isStreaming}
        isWorking={isSubmitting || hasPendingRun}
        messages={visibleMessages}
        onRejectPermission={() => submitMessage("Do not run this action. Continue without it.")}
        onResolveTask={resolveTask}
        onRestoreMessage={restoreMessage}
        restoringMessageId={restoringMessageId}
        taskDisabled={isSubmitting || restoringMessageId !== null}
      />
      <div className="shrink-0 px-3 pb-3">
        {/* A run that has gone quiet. Offered rather than done automatically:
            v0 is occasionally just slow, and cancelling a turn that was about
            to land would throw away the build the user paid for. */}
        {!hasStalled && abandonedTurn ? (
          <div className="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              v0 stopped part-way through this turn and did not write the site. Send a follow-up —
              &ldquo;continue&rdquo; is usually enough — and it will pick up where it left off.
            </p>
          </div>
        ) : null}
        {hasStalled ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              v0 has not sent anything for a few minutes. This build may have stalled.
            </p>
            <Button
              className="shrink-0"
              disabled={isStopping}
              onClick={() => void stopMessage()}
              size="sm"
              variant="outline"
            >
              {isStopping ? <Loader size={14} /> : null}
              {isStopping ? "Stopping…" : "Stop this run"}
            </Button>
          </div>
        ) : null}
        <PromptBox
          isStopping={isStopping}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting || restoringMessageId !== null}
          onStop={stopMessage}
          onSubmit={submitMessage}
        />
        {error ? <p className="mt-1.5 px-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </>
  );
}

/**
 * Puts the user's own words back in front of the composed opening message.
 *
 * A build's first message is their brief plus our build rule. v0 needs every
 * line of that. The user wrote one sentence and should read one sentence back —
 * being shown our instructions verbatim reads like the app talking to itself.
 *
 * Only the first user message is touched: every later one is exactly what they
 * typed into the box.
 */
function withOriginalPrompt(
  messages: V0UIMessage[],
  prompt: string | null | undefined,
): V0UIMessage[] {
  if (!prompt?.trim()) return messages;

  const index = messages.findIndex((message) => message.role === "user");
  if (index === -1) return messages;

  return messages.map((message, at) => {
    if (at !== index) return message;

    // The prompt replaces the first text part and removes any others, so a
    // message that arrived split across parts does not repeat it. Attachments
    // and every other part type are left alone.
    const parts: V0UIMessage["parts"] = [];
    let written = false;

    for (const part of message.parts) {
      if (part.type !== "text") {
        parts.push(part);
        continue;
      }
      if (written) continue;

      written = true;
      parts.push({ ...part, text: prompt });
    }

    return { ...message, parts };
  });
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
