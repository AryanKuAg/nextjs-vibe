import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Fragment } from "@prisma/client";

import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { MessageLoading } from "./message-loading";

// If the last message has been from a USER for longer than this, show a recovery UI
const STUCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes – site generation can take a long time

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
};

export const MessagesContainer = ({
  projectId,
  activeFragment,
  setActiveFragment,
  stage = "SITE",
  extractedZipUrl,
  onBack,
}: Props & { stage?: "SCENE" | "VIDEO" | "SITE", extractedZipUrl?: string | null, onBack?: () => void }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);

  // Track when the last user message was sent to detect stuck state
  const lastUserMessageTimestampRef = useRef<number | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  const { data: messages } = useSuspenseQuery(trpc.messages.getMany.queryOptions({
    projectId: projectId,
    stage: stage,
  }, {
    refetchInterval: 2000,
  }));

  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.role === "USER";

  // Track when user message arrived; detect if stuck after timeout
  useEffect(() => {
    if (isLastMessageUser) {
      if (lastUserMessageTimestampRef.current === null) {
        lastUserMessageTimestampRef.current = Date.now();
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
      setActiveFragment(lastAssistantMessage.fragment);
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
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              role={message.role}
              fragment={message.fragment}
              createdAt={message.createdAt}
              isActiveFragment={activeFragment?.id === message.fragment?.id}
              onFragmentClick={() => setActiveFragment(message.fragment)}
              type={message.type}
            />
          ))}
          {isLastMessageUser && !isStuck && <MessageLoading />}
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
                  {injectErrorMessage.isPending ? "Resetting..." : "Dismiss & retry"}
                </button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-0 right-0 h-6 pointer-events-none" />
        <MessageForm projectId={projectId} stage={stage} extractedZipUrl={extractedZipUrl} />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 w-full rounded-[8px] bg-background! border-[1px] border-[#282825] text-white font-inconsolata text-sm h-9 hover:bg-white/5! font-[400]"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
};
