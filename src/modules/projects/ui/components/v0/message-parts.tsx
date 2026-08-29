"use client";

import type { V0UIMessage } from "@v0-sdk/react";
import type { ReactNode } from "react";

import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import {
  AgentIcon,
  ChevronDownIcon,
  CrossCircleIcon,
  EyeIcon,
  FileIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
  ToolIcon,
} from "@/lib/icons";

/**
 * Renders one v0 message.
 *
 * v0 streams a turn as typed parts: reasoning, file reads and edits, searches,
 * shell commands, tool calls, agent actions. Two rules shape how they are
 * shown:
 *
 * 1. One line per action, and the line says what it touched. A read is
 *    "Read file app/page.tsx", not a disclosure triangle hiding a path — the
 *    transcript reads as a log you can skim without clicking anything.
 * 2. The running step shimmers. Otherwise the last line just sits there and a
 *    working build is indistinguishable from a hung one.
 * 3. Only the closing summary is shown as prose. v0 opens each turn by
 *    restating the request and describing its plan, which the list of steps
 *    below then shows actually happening.
 *
 * Consecutive reads used to collapse into "Explored 4 files" with the paths
 * behind a disclosure. The design calls for the flat list instead.
 */

type MessagePart = V0UIMessage["parts"][number];
type FileEditPart = Extract<MessagePart, { type: "data-v0-file-edit" }>;
type AgentActionPart = Extract<MessagePart, { type: "data-v0-agent-action" }>;

/**
 * Drops the agent's opening narration.
 *
 * v0 starts most turns by explaining what it is about to do — "I'll turn this
 * into a polished interface, but I need one direction first…". It restates the
 * request and then repeats itself in the closing summary, so on a screen that
 * already lists every step it is noise.
 *
 * The distinction is positional: prose with work after it is a preamble, prose
 * with nothing after it is the summary. Keeping only the trailing run also
 * leaves a turn that is *only* prose — a plain answer, a refusal — fully
 * intact, which a blanket "hide the first text part" rule would have eaten.
 */
function withoutPreamble(parts: readonly MessagePart[]): MessagePart[] {
  const lastActivity = parts.findLastIndex((part) => part.type !== "text");

  // All prose and no work — a plain answer or a refusal. Shown in full. This
  // was briefly hidden while a turn was live, on the theory that prose arriving
  // first is always a preamble. It is not: v0 answers plenty of turns in words
  // alone, and those rendered as an empty panel until the turn closed.
  if (lastActivity === -1) return [...parts];

  return parts.filter((part, index) => part.type !== "text" || index > lastActivity);
}

export function MessageParts({
  message,
  isStreaming = false,
  isLive = false,
}: {
  message: V0UIMessage;
  /** The SSE is delivering this message right now — drives text animation. */
  isStreaming?: boolean;
  /** The turn is open, however the transcript is arriving — drives the shimmer. */
  isLive?: boolean;
}) {
  const isAssistant = message.role !== "user";

  if (!isAssistant) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {message.parts.map((part, index) => (
          <MessagePartView
            isAssistant={false}
            isActive={false}
            isStreaming={false}
            key={`${message.id}-${index}`}
            part={part}
          />
        ))}
      </div>
    );
  }

  const parts = withoutPreamble(message.parts);
  // Only the final part can still be in flight, and only while the turn is open.
  const activeIndex = isLive ? parts.length - 1 : -1;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {parts.map((part, index) => (
        <MessagePartView
          isAssistant
          isActive={index === activeIndex}
          isStreaming={isStreaming}
          key={`${message.id}-${index}`}
          part={part}
        />
      ))}
    </div>
  );
}

function MessagePartView({
  part,
  isAssistant,
  isActive,
  isStreaming,
}: {
  part: MessagePart;
  isAssistant: boolean;
  isActive: boolean;
  isStreaming: boolean;
}) {
  switch (part.type) {
    case "text": {
      const text = isAssistant ? visibleAssistantText(part.text) : part.text;
      return text ? (
        <Markdown isStreaming={isStreaming && part.state === "streaming"}>{text}</Markdown>
      ) : null;
    }
    case "reasoning":
      return <ThinkingPart isActive={isActive} isStreaming={isStreaming} part={part} />;
    case "file":
      return <Activity icon={<FileIcon />} isActive={false} title="Attached a file" />;
    case "data-v0-file-read":
      // One line per path: v0 emits reads in batches, and the design shows each
      // file on its own row rather than a count you have to open.
      return (
        <div className="flex min-w-0 flex-col gap-2.5">
          {part.data.paths.map((path, index) => (
            <Activity
              detail={path}
              icon={<EyeIcon />}
              isActive={isActive && index === part.data.paths.length - 1}
              key={`${path}-${index}`}
              mono
              title="Read file"
            />
          ))}
        </div>
      );
    case "data-v0-file-edit":
      return (
        <Activity
          detail={
            part.data.operation === "rename" && part.data.toPath
              ? `${part.data.path} → ${part.data.toPath}`
              : part.data.path
          }
          icon={<FileIcon />}
          isActive={isActive}
          mono
          title={`${fileEditLabel(part.data.operation)} file`}
        />
      );
    case "data-v0-search":
      return (
        <Activity
          detail={part.data.query}
          icon={<SearchIcon />}
          isActive={isActive}
          title={part.data.scope === "web" ? "Searched the web" : "Searched the codebase"}
        />
      );
    case "data-v0-bash":
      return (
        <Activity
          detail={part.data.command}
          icon={<TerminalIcon />}
          isActive={isActive}
          mono
          title="Ran a command"
        />
      );
    case "data-v0-tool-call": {
      const failed = part.data.status === "error";
      return (
        <Activity
          error={failed}
          icon={failed ? <CrossCircleIcon /> : <ToolIcon />}
          detail={formatToolDetails(part.data.input, part.data.output)}
          isActive={isActive && !failed}
          title={failed ? `${humanize(part.data.name)} failed` : humanize(part.data.name)}
        />
      );
    }
    case "data-v0-agent-action":
      return (
        <Activity
          detail={
            part.data.data === undefined || isPendingAgentAction(part)
              ? undefined
              : formatValue(part.data.data)
          }
          icon={<AgentIcon />}
          isActive={isActive}
          title={humanize(part.data.name)}
        />
      );
    default:
      return null;
  }
}

/**
 * An action still waiting on the user is rendered by TaskResolution as an
 * interactive card. Dumping its payload here too would show the question twice.
 */
function isPendingAgentAction(part: AgentActionPart) {
  const data = part.data.data;
  if (!data) return false;

  return (
    (part.data.name === "ask_user_questions" && "questions" in data) ||
    (part.data.name === "exit_plan_mode" && "plan" in data) ||
    (part.data.name === "get_or_request_integration" && "requestedIntegrations" in data)
  );
}

/**
 * v0 embeds the generated source in a `<CodeProject>` block inside its prose.
 * The code pane already shows the files, so the block is stripped rather than
 * printed as a wall of markup in the transcript.
 */
function visibleAssistantText(text: string) {
  const projectStart = text.indexOf("<CodeProject");
  if (projectStart === -1) return text;

  const projectEnd = text.indexOf("</CodeProject>", projectStart);
  if (projectEnd === -1) return text.slice(0, projectStart).trim();

  return `${text.slice(0, projectStart)}${text.slice(projectEnd + "</CodeProject>".length)}`.trim();
}

function ThinkingPart({
  part,
  isActive,
  isStreaming,
}: {
  part: Extract<MessagePart, { type: "reasoning" }>;
  isActive: boolean;
  isStreaming: boolean;
}) {
  if (!part.text) return null;

  const thinking = isStreaming && part.state === "streaming";

  return (
    <details className="group text-white-50">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-0.5 text-xs leading-[16px] font-medium hover:text-white-85 [&::-webkit-details-marker]:hidden">
        <SparklesIcon className="size-3.5 shrink-0" />
        <span className={cn(thinking || isActive ? "shimmer-text" : undefined)}>
          {thinking || isActive ? "Thinking" : "Thought for a moment"}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 border-l border-border pl-3 text-xs leading-[18px] text-white-50">
        <Markdown isStreaming={thinking}>{part.text}</Markdown>
      </div>
    </details>
  );
}

function Markdown({ children, isStreaming }: { children: string; isStreaming: boolean }) {
  return (
    <Response
      animated={isStreaming}
      isAnimating={isStreaming}
      mode={isStreaming ? "streaming" : "static"}
      parseIncompleteMarkdown={isStreaming}
    >
      {children}
    </Response>
  );
}

/**
 * One line of "what the agent did", with what it touched alongside it.
 *
 * The detail sits on the same row rather than behind a disclosure — one glance
 * tells you which file moved. It truncates, and the full value is on the row's
 * `title` for anything that overflows.
 */
function Activity({
  title,
  detail,
  icon,
  isActive,
  error = false,
  mono = false,
}: {
  title: string;
  /** Path, query, command — whatever this action acted on. */
  detail?: string;
  icon: ReactNode;
  isActive: boolean;
  error?: boolean;
  /** Paths and commands read as code; prose details do not. */
  mono?: boolean;
}) {
  const body = detail?.trim() ? detail.trim() : undefined;

  return (
    // leading-[16px] on the row, and the icon in its own flex box: an inline SVG
    // otherwise sits on a 20px baseline and pushes every row 4px taller than
    // the 30px rhythm the design spaces them on.
    <div
      className="flex min-w-0 items-center gap-2 py-0.5 leading-[16px]"
      title={body ? `${title} ${body}` : title}
    >
      <span
        className={cn(
          "flex shrink-0 items-center [&>svg]:size-3.5",
          error ? "text-destructive" : "text-white-85",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs leading-[16px] font-medium text-white",
          error && "text-destructive",
          isActive && !error && "shimmer-text",
        )}
      >
        {title}
      </span>
      {body ? (
        <span
          className={cn(
            "min-w-0 truncate text-[11px] leading-[15px] text-white-50",
            mono && "font-mono",
          )}
        >
          {body}
        </span>
      ) : null}
    </div>
  );
}

function fileEditLabel(operation: FileEditPart["data"]["operation"]) {
  const labels = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    rename: "Renamed",
    patch: "Patched",
  } as const;

  return labels[operation];
}

function humanize(value: string) {
  return value.replaceAll(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatToolDetails(input: unknown, output: unknown) {
  const details = [];
  if (input !== undefined) details.push(`Input\n${formatValue(input)}`);
  if (output !== undefined) details.push(`Output\n${formatValue(output)}`);
  return details.join("\n\n") || undefined;
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
