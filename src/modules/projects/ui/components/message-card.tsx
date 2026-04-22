import "remixicon/fonts/remixicon.css";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Fragment, MessageRole, MessageType } from "@prisma/client";
import Image from "next/image";

interface UserMessageProps {
  content: string;
}

const UserMessage = ({ content }: UserMessageProps) => {
  return (
    <div className="flex justify-end pb-4 pr-2 pl-10">
      <Card className="rounded-lg bg-[#272725] py-3 px-4 shadow-none border-none max-w-[80%] break-words text-sm">
        {content}
      </Card>
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

interface AssistantMessageProps {
  content: string;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
};

const AssistantMessage = ({
  content,
  fragment,
  onFragmentClick,
  type,
}: AssistantMessageProps) => {
  return (
    <div className={cn(
      "flex group px-2 pb-4 gap-2.5 items-start",
      type === "ERROR" && "text-red-700 dark:text-red-500",
    )}>
      <div className="flex-shrink-0 mt-0.5">
        <Image
          src="/logo.png"
          alt="Vibe"
          width={24}
          height={24}
          className="shrink-0"
        />
      </div>
      <div className="flex flex-col gap-y-4 pt-0.5">
        <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
          {content || (type === "RESULT" ? "Building..." : "")}
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
};

export const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
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
      />
    )
  }

  return (
    <UserMessage content={content} />
  );
};
