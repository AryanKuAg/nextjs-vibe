import "remixicon/fonts/remixicon.css";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MessageRole, MessageType } from "@prisma/client";
import { AGENT_STATUS, resolveAgentStatus } from "./agent-status";

const InteractiveMessageHeader = ({ text = "Awaiting user input", showTimer = true, displayTime = 0, isCompleted = false }: { text?: string, showTimer?: boolean, displayTime?: number, isCompleted?: boolean }) => {
  const seconds = Math.floor(displayTime / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeString = m > 0 ? `${m}m ${s}s` : `${seconds}s`;

  return (
    <div className="flex items-center gap-2 mb-0.5">
      <span className={cn(
        "font-normal text-[14px]",
        isCompleted
          ? "text-white/80"
          : "bg-gradient-to-r from-white/30 via-white to-white/30 bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent"
      )}>
        {text}
      </span>
      {showTimer && (
        <>
          <span className="text-white/40 text-[13px]">&middot;</span>
          <span className="text-white/40 text-[13px]">{timeString}</span>
        </>
      )}
    </div>
  );
};

interface UserMessageProps {
  content: string;
}

const UserMessage = ({ content }: UserMessageProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > 148) {
        setIsOverflowing(true);
      }
    }
  }, [content]);

  return (
    <div className="flex justify-end pb-4 pr-2 pl-10">
      <div className="flex flex-col max-w-[80%] w-fit">
        <Card className="rounded-[10px] bg-white-8 px-3 py-2 shadow-none border-none break-words text-sm leading-[20px] text-white relative overflow-hidden">
          <div
            ref={contentRef}
            className={cn(
              "transition-all duration-300 relative whitespace-pre-wrap",
              !isExpanded && isOverflowing ? "max-h-[148px] overflow-hidden" : ""
            )}
          >
            {content}
          </div>

          {!isExpanded && isOverflowing && (
            // <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#171717] to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-[148px] bg-gradient-to-t from-[#171717] to-transparent pointer-events-none" />
          )}
        </Card>

        {isOverflowing && (
          <div className="px-2 flex items-center self-start h-[28px] rounded-[8px] hover:bg-[#212121] mt-1 transition-colors duration-300 ease-out">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white text-[12px] transition-colors"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface InteractiveContent {
  text: string;
  mediaUrl?: string;
  buttons: { label: string; action: string }[];
}

interface AssistantMessageProps {
  content: string;
  createdAt: Date;
  startedAt?: Date;
  type: MessageType;
  projectId: string;
  pendingInteractiveAction: string | null;
  setPendingInteractiveAction: (action: string | null) => void;
  onActionSubmit?: () => void;
  isLastMessage?: boolean;
  interactiveSubmittedAt?: Date | null;
  currentStage?: string;
  onMockAction?: (action: string) => void;
  isMockSubmitted?: boolean;
  messageId: string;
  globalElapsedMs: number;
};

const AssistantMessage = ({
  content,
  createdAt,
  startedAt,
  type,
  projectId,
  pendingInteractiveAction,
  setPendingInteractiveAction,
  isLastMessage = false,
  interactiveSubmittedAt = null,
  currentStage,
  onMockAction,
  isMockSubmitted = false,
  messageId,
  globalElapsedMs,
  onActionSubmit,
}: AssistantMessageProps) => {
  const accumulatedTime = startedAt ? new Date(createdAt).getTime() - new Date(startedAt).getTime() : 0;

  let interactiveContent: InteractiveContent | null = null;
  if (type === "INTERACTIVE") {
    try {
      interactiveContent = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse interactive message content", e);
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [lockedTime, setLockedTime] = useState<number | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(`locked_time_${messageId}`);
    if (saved) {
      setLockedTime(parseInt(saved, 10));
    }
  }, [messageId]);

  useEffect(() => {
    if (!isLastMessage && lockedTime === null) {
      setLockedTime(globalElapsedMs);
      sessionStorage.setItem(`locked_time_${messageId}`, globalElapsedMs.toString());
    }
  }, [isLastMessage, lockedTime, globalElapsedMs, messageId]);

  const displayTime = lockedTime !== null ? lockedTime : (isLastMessage ? globalElapsedMs : accumulatedTime);

  const submitted = localSubmitted || !!interactiveSubmittedAt || isMockSubmitted;

  useEffect(() => {
    setLocalSubmitted(false);
    setLastAction(null);
  }, [content]);

  const handleAction = async (action: string) => {
    if (onMockAction) {
      onMockAction(action);
      setLastAction(action);
      return;
    }

    if (["WRITE_PROMPT"].includes(action)) {
      if (pendingInteractiveAction === action) {
        setPendingInteractiveAction(null);
        setLastAction(null);
      } else {
        setPendingInteractiveAction(action);
        // Record the intent now, while we still know which card it came from.
        // The prompt itself is submitted from the message form, which cannot set
        // this, and without it the status line cannot tell whether a scene or a
        // video is being regenerated until the backend catches up.
        setLastAction(action);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch("/api/inngest/user-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action }),
      });
      setLastAction(action);
      setLocalSubmitted(true);
      setPendingInteractiveAction(null);
      if (onActionSubmit) onActionSubmit();
    } catch (error) {
      console.error("Failed to submit action", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // An assistant card only renders a status while the agent is mid-run, which by
  // definition means it has already responded — so this is never the opening
  // "Working" state, that belongs to the standalone row under the thread.
  const getLoadingText = () =>
    resolveAgentStatus({
      currentStage,
      lastAction,
      interactiveButtonActions: interactiveContent?.buttons?.map((b) => b.action) ?? [],
      interactiveText: interactiveContent?.text,
      awaitingFirstResponse: false,
    });

  if (type === "INTERACTIVE" && interactiveContent && !isLastMessage) {
    return null;
  }

  return (
    <div className={cn(
      "flex group pb-4 px-3 items-start",
      type === "ERROR" && "text-red-700 dark:text-red-500",
    )}>
      <div className="flex flex-col gap-y-4 pt-0.5 w-full">
        <div className="text-white text-sm leading-[20px] whitespace-pre-wrap">
          {type === "INTERACTIVE" && interactiveContent ? (
            (!submitted && isLastMessage) ? (
              <div className="flex flex-col gap-3">
                <InteractiveMessageHeader displayTime={displayTime} showTimer={false} />
                {interactiveContent.mediaUrl ? (
                  <>
                    {interactiveContent.text !== "Awaiting user input" && (
                      <div className="text-white/60 text-[13px]">
                        {interactiveContent.text}
                      </div>
                    )}
                    <div className="w-full max-w-[500px] aspect-video rounded-[8px] overflow-hidden bg-[#1a1a1a]">
                      {interactiveContent.mediaUrl.endsWith(".mp4") ? (
                        <video
                          src={interactiveContent.mediaUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={interactiveContent.mediaUrl}
                          alt="Generated scene"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </>
                ) : (
                  interactiveContent.text !== "Awaiting user input" && (
                    <div>{interactiveContent.text}</div>
                  )
                )}
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex flex-wrap gap-2">
                    {interactiveContent.buttons?.map((btn, i) => {
                      const isSelected = pendingInteractiveAction === btn.action;
                      return (
                        <button
                          key={i}
                          onClick={() => handleAction(btn.action)}
                          disabled={isSubmitting}
                          className={cn(
                            "px-2  rounded-[8px] text-[14px] font-normal border h-[28px] leading-[20px]",
                            isSelected
                              ? "bg-white text-black border-white hover:bg-gray-200"
                              : "bg-transparent text-white border-white-8 hover:bg-white-8"
                          )}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              isLastMessage ? (
                <div className="flex flex-col gap-3">
                  <InteractiveMessageHeader
                    text={getLoadingText()}
                    showTimer={true}
                    displayTime={displayTime}
                  />
                </div>
              ) : null
            )
          ) : (
            type === "RESULT" && content ? (
              <div className="flex flex-col gap-3">
                <InteractiveMessageHeader
                  text={AGENT_STATUS.COMPLETED}
                  showTimer={true}
                  displayTime={displayTime}
                  isCompleted={true}
                />
                <div className="text-white text-sm leading-[20px] whitespace-pre-wrap">
                  {content}
                </div>
              </div>
            ) : type === "RESULT" && isLastMessage ? (
              <div className="flex flex-col gap-3">
                <InteractiveMessageHeader
                  text={getLoadingText()}
                  showTimer={true}
                  displayTime={displayTime}
                />
              </div>
            ) : type === "RESULT" ? (
              null
            ) : (
              content
            )
          )}
        </div>
      </div>
    </div>
  )
};

interface MessageCardProps {
  content: string;
  role: MessageRole;
  createdAt: Date;
  startedAt?: Date;
  type: MessageType;
  projectId: string;
  pendingInteractiveAction: string | null;
  setPendingInteractiveAction: (action: string | null) => void;
  onActionSubmit?: () => void;
  isLastMessage?: boolean;
  interactiveSubmittedAt?: Date | null;
  currentStage?: string;
  onMockAction?: (action: string) => void;
  isMockSubmitted?: boolean;
  messageId: string;
  globalElapsedMs: number;
}

export const MessageCard = ({
  content,
  role,
  createdAt,
  startedAt,
  type,
  projectId,
  pendingInteractiveAction,
  setPendingInteractiveAction,
  isLastMessage = false,
  interactiveSubmittedAt = null,
  currentStage,
  onMockAction,
  isMockSubmitted,
  messageId,
  globalElapsedMs,
  onActionSubmit,
}: MessageCardProps) => {
  if (role === "ASSISTANT") {
    return (
      <AssistantMessage
        content={content}
        createdAt={createdAt}
        startedAt={startedAt}
        type={type}
        projectId={projectId}
        pendingInteractiveAction={pendingInteractiveAction}
        setPendingInteractiveAction={setPendingInteractiveAction}
        isLastMessage={isLastMessage}
        interactiveSubmittedAt={interactiveSubmittedAt}
        currentStage={currentStage}
        onMockAction={onMockAction}
        isMockSubmitted={isMockSubmitted}
        messageId={messageId}
        globalElapsedMs={globalElapsedMs}
        onActionSubmit={onActionSubmit}
      />
    )
  }

  return (
    <UserMessage content={content} />
  );
};
