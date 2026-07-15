import "remixicon/fonts/remixicon.css";
import { useState, useRef, useEffect } from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Fragment, MessageRole, MessageType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { ShimmerMessages } from "./message-loading";

const InteractiveMessageHeader = ({ createdAt, text = "Awaiting user input" }: { createdAt: Date, text?: string }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const startMs = new Date(createdAt).getTime();
    setElapsedMs(Math.max(0, Date.now() - startMs));
    const timerInterval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startMs));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [createdAt]);

  const seconds = Math.floor(elapsedMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timeString = m > 0 ? `${m}m ${s}s` : `${seconds}s`;

  return (
    <div className="flex items-center gap-2 mb-0.5">
      <span className="font-medium text-[15px] bg-gradient-to-r from-white via-white/50 to-white bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent">
        {text}
      </span>
      <span className="text-white/40 text-[13px]">&middot;</span>
      <span className="text-white/40 text-[13px]">{timeString}</span>
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
        <Card className="rounded-[16px] bg-[#212121] p-4 shadow-none border-none break-words text-[15px] leading-relaxed text-white/90 relative overflow-hidden">
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

interface FragmentCardProps {
  fragment: Fragment;
  onFragmentClick: (fragment: Fragment) => void;
};

const FragmentCard = ({
  fragment,
  onFragmentClick,
}: FragmentCardProps) => {
  return (
    <button
      className={cn(
        "flex items-start text-start gap-2  rounded-lg  w-fit p-3 bg-white text-[#272725]"
      )}
      onClick={() => onFragmentClick(fragment)}
    >
      <i className="ri-code-s-slash-line size-4 mt-0.5" />
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium line-clamp-1">
          {fragment.title}
        </span>
        <span className="text-sm">Preview</span>
      </div>
      <div className="flex items-center justify-center mt-0.5">
        <i className="ri-arrow-right-s-line size-4" />
      </div>
    </button>
  );
};

interface InteractiveContent {
  text: string;
  mediaUrl?: string;
  buttons: { label: string; action: string }[];
}

interface AssistantMessageProps {
  content: string;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  projectId: string;
  pendingInteractiveAction: string | null;
  setPendingInteractiveAction: (action: string | null) => void;
  onActionSubmit?: () => void;
  isLastMessage?: boolean;
  isInteractiveSubmitted?: boolean;
};

const AssistantMessage = ({
  content,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
  projectId,
  pendingInteractiveAction,
  setPendingInteractiveAction,
  isLastMessage = false,
  isInteractiveSubmitted = false,
}: AssistantMessageProps) => {
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
  
  const submitted = localSubmitted || isInteractiveSubmitted;

  useEffect(() => {
    setLocalSubmitted(false);
  }, [content]);

  const handleAction = async (action: string) => {
    if (["WRITE_PROMPT", "REGENERATE"].includes(action)) {
      if (pendingInteractiveAction === action) {
        setPendingInteractiveAction(null);
      } else {
        setPendingInteractiveAction(action);
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
      setLocalSubmitted(true);
      setPendingInteractiveAction(null);
    } catch (error) {
      console.error("Failed to submit action", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (type === "INTERACTIVE" && interactiveContent && !submitted && !isLastMessage) {
    return null;
  }

  return (
    <div className={cn(
      "flex group pb-4 px-3 items-start",
      type === "ERROR" && "text-red-700 dark:text-red-500",
    )}>
      <div className="flex flex-col gap-y-4 pt-0.5 w-full">
        <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
          {type === "INTERACTIVE" && interactiveContent ? (
            (!submitted && isLastMessage) ? (
              <div className="flex flex-col gap-3">
                <InteractiveMessageHeader createdAt={createdAt} />
                {interactiveContent.mediaUrl ? (
                  <>
                    {interactiveContent.text !== "Awaiting user input" && (
                      <div className="text-white/60 text-[13px]">
                        {interactiveContent.text}
                      </div>
                    )}
                    <div className="w-full max-w-[500px] aspect-video rounded-xl overflow-hidden border border-[#333] bg-[#1a1a1a]">
                      {interactiveContent.mediaUrl.endsWith(".mp4") ? (
                        <video 
                          src={interactiveContent.mediaUrl} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
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
                            "px-2 py-1 rounded-[8px] text-[14px] font-medium transition-all duration-200 border",
                            isSelected
                              ? "bg-white text-black border-white hover:bg-gray-200" 
                              : "bg-transparent text-white border-[#333] hover:bg-white/5"
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
                  <InteractiveMessageHeader createdAt={createdAt} text="Generating scene" />
                </div>
              ) : null
            )
          ) : (
            content || (type === "RESULT" ? (
              <div className="flex flex-col gap-3">
                <InteractiveMessageHeader createdAt={createdAt} text="Working..." />
              </div>
            ) : "")
          )}
        </div>
        {fragment && type === "RESULT" && (
          <FragmentCard
            fragment={fragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  )
};

interface MessageCardProps {
  content: string;
  role: MessageRole;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
  projectId: string;
  pendingInteractiveAction: string | null;
  setPendingInteractiveAction: (action: string | null) => void;
  onActionSubmit?: () => void;
  isLastMessage?: boolean;
  isInteractiveSubmitted?: boolean;
};

export const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
  projectId,
  pendingInteractiveAction,
  setPendingInteractiveAction,
  isLastMessage = false,
  isInteractiveSubmitted = false,
}: MessageCardProps) => {
  if (role === "ASSISTANT") {
    return (
      <AssistantMessage
        content={content}
        fragment={fragment}
        createdAt={createdAt}
        isActiveFragment={isActiveFragment}
        onFragmentClick={onFragmentClick}
        type={type}
        projectId={projectId}
        pendingInteractiveAction={pendingInteractiveAction}
        setPendingInteractiveAction={setPendingInteractiveAction}
        isLastMessage={isLastMessage}
        isInteractiveSubmitted={isInteractiveSubmitted}
      />
    )
  }

  return (
    <UserMessage content={content} />
  );
};
