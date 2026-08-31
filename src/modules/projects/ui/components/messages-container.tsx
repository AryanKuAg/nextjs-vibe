import { useEffect, useRef, useState, useCallback } from "react";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

import { Fragment } from "@prisma/client";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { MessageLoading } from "./message-loading";
import { resolveAgentStatus } from "./agent-status";

// If the last message has been from a USER for longer than this, show a recovery UI
const STUCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes – site generation can take a long time

interface Props {
  projectId: string;
  setActiveFragment?: (fragment: Fragment) => void;
};

function useGenerationTimer(isWorking: boolean, sessionKey: string) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        setElapsedMs(parseInt(saved, 10));
      }
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!isWorking) {
      sessionStorage.removeItem(sessionKey + "_last_tick");
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTickStr = sessionStorage.getItem(sessionKey + "_last_tick");
      const lastTick = lastTickStr ? parseInt(lastTickStr, 10) : now;
      const delta = now - lastTick;
      
      setElapsedMs(prev => {
        const next = prev + delta;
        sessionStorage.setItem(sessionKey, next.toString());
        return next;
      });
      sessionStorage.setItem(sessionKey + "_last_tick", now.toString());
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorking, sessionKey]);

  const reset = useCallback(() => {
    sessionStorage.setItem(sessionKey, "0");
    sessionStorage.removeItem(sessionKey + "_last_tick");
    setElapsedMs(0);
  }, [sessionKey]);

  return {
    elapsedMs,
    reset
  };
}

export const MessagesContainer = ({
  projectId,
  setActiveFragment,
  stage = "SITE",
  extractedZipUrl,
  extractedFrameCount,
  onBack,
  initialPrompt,
}: Props & { stage?: "SCENE" | "VIDEO" | "SITE", extractedZipUrl?: string | null, extractedFrameCount?: number, onBack?: () => void, initialPrompt?: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);


  // Track when the last user message was sent to detect stuck state
  const lastUserMessageTimestampRef = useRef<number | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [pendingInteractiveAction, setPendingInteractiveAction] = useState<string | null>(null);
  const [interactiveSubmittedAt, setInteractiveSubmittedAt] = useState<Date | null>(null);


  const { data: messages } = useSuspenseQuery(trpc.messages.getMany.queryOptions({
    projectId: projectId,
    stage: stage,
  }, {
    refetchInterval: 2000,
  }));

  // Already polled for freshness; its currentStage is what drives the status line.
  const { data: project } = useQuery(
    trpc.projects.getOne.queryOptions({ id: projectId }, { refetchInterval: 2000 })
  );
  const currentStage = project?.currentStage;

  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.role === "USER";
  const isLastMessageEmptyResult = lastMessage?.role === "ASSISTANT" && lastMessage?.type === "RESULT" && lastMessage?.content === "";
  const isGenerating = (isLastMessageUser && !isStuck) || isLastMessageEmptyResult;
  const isWorking = (isLastMessageUser && !isStuck) || isLastMessageEmptyResult || interactiveSubmittedAt !== null;
  const generationTimer = useGenerationTimer(isWorking, `vibe_timer_${projectId}_${stage}`);

  // Reset interactive submitted state when new messages arrive or content changes
  useEffect(() => {
    setInteractiveSubmittedAt(null);
  }, [lastMessage?.id, lastMessage?.content]);

  // Track when user message arrived; detect if stuck after timeout
  useEffect(() => {
    if (isLastMessageUser) {
      if (lastUserMessageTimestampRef.current === null) {
        lastUserMessageTimestampRef.current = Date.now();
        generationTimer.reset();
      }

      const timer = setTimeout(() => {
        // Still waiting after timeout — show recovery UI
        setIsStuck(true);
      }, STUCK_TIMEOUT_MS);

      return () => clearTimeout(timer);
    } else {
      // Assistant replied — reset everything
      lastUserMessageTimestampRef.current = null;
      setIsStuck(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastMessageUser, lastMessage?.id]);

  // Reset stuck flag whenever the message list changes (new assistant reply)
  useEffect(() => {
    if (!isLastMessageUser) {
      setIsStuck(false);
    }
  }, [messages.length, isLastMessageUser]);

  // Create a synthetic "error" assistant message to un-jam the thread
  const injectErrorMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        setIsStuck(false);
        lastUserMessageTimestampRef.current = null;
        queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
      },
    })
  );

  const handleRetry = () => {
    injectErrorMessage.mutate({
      value: "⚠️ The previous generation timed out or failed. Please try your prompt again.",
      projectId,
      stage,
      model: "system-error",
    });
  };

  useEffect(() => {
    const lastAssistantMessage = messages.findLast(
      (message) => message.role === "ASSISTANT"
    );

    if (
      lastAssistantMessage?.fragment &&
      lastAssistantMessage.id !== lastAssistantMessageIdRef.current
    ) {
      if (setActiveFragment) {
        setActiveFragment(lastAssistantMessage.fragment);
      }
      lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    }
  }, [messages, setActiveFragment]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="pt-2 pr-1">
          {messages.map((message, index) => {
            let startedAt = message.createdAt;
            for (let i = index; i >= 0; i--) {
              if (messages[i].role === "USER") {
                startedAt = messages[i].createdAt;
                break;
              }
            }

            return (
              <MessageCard
                key={message.id}
                content={message.content}
                role={message.role}
                createdAt={message.createdAt}
                startedAt={startedAt}
                type={message.type}
                projectId={projectId}
                pendingInteractiveAction={pendingInteractiveAction}
                setPendingInteractiveAction={setPendingInteractiveAction}
                isLastMessage={index === messages.length - 1}
                messageId={message.id}
                currentStage={currentStage}
                // Required for the card to switch from the media preview to the
                // status line: "Prompt Again" is submitted from the message form,
                // not the card, so the card has no local state to go on.
                interactiveSubmittedAt={interactiveSubmittedAt}
                globalElapsedMs={generationTimer.elapsedMs}
                onActionSubmit={() => setInteractiveSubmittedAt(new Date())}
              />
            );
          })}

          {isLastMessageUser && !isStuck && (
            <MessageLoading
              globalElapsedMs={generationTimer.elapsedMs}
              // The agent hasn't replied yet, so this reads "Working" until the
              // backend names a stage — then it tracks the real step.
              text={resolveAgentStatus({ currentStage, awaitingFirstResponse: true })}
            />
          )}
          {isLastMessageUser && isStuck && (
            <div className="px-2 pb-4 flex items-start gap-2.5">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-red-400">
                  Generation timed out or failed. The AI agent may have encountered an error.
                </p>
                <button
                  onClick={handleRetry}
                  disabled={injectErrorMessage.isPending}
                  className="self-start px-3 py-1.5 rounded-[6px] bg-[#272725] border border-[#3B3B3B] text-white text-xs hover:bg-white/5 disabled:opacity-50 transition-colors"
                >
                  {injectErrorMessage.isPending ? "Restarting..." : "Restart Generation"}
                </button>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center min-h-[300px]">
              {/* <h2 className="text-xl font-medium text-white mb-2">New website</h2> */}
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-0 right-0 h-6 pointer-events-none" />
        <MessageForm
          projectId={projectId}
          stage={stage}
          extractedZipUrl={extractedZipUrl}
          extractedFrameCount={extractedFrameCount}
          isGenerating={isGenerating}
          initialPrompt={initialPrompt}
          pendingInteractiveAction={pendingInteractiveAction}
          setPendingInteractiveAction={setPendingInteractiveAction}
          setInteractiveSubmittedAt={setInteractiveSubmittedAt}
        />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 w-full rounded-[8px] bg-background! border-[1px] border-[#2c2c2c] text-white font-sans text-sm hover:bg-[#282828]! font-[400] h-[32px]"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
};
