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
 * shown, both aimed at somebody who is not a developer:
 *
 * 1. Say what happened, not which files. A build emits a dozen reads in a row,
 *    and "Read file app/page.tsx" twelve times is noise to a person who has
 *    never opened app/page.tsx. Consecutive parts of a kind collapse into one
 *    line with a count; the paths stay, one click away.
 * 2. The running step shimmers. Otherwise the last line just sits there and a
 *    working build is indistinguishable from a hung one.
 * 3. Only the closing summary is shown as prose. v0 opens each turn by
 *    restating the request and describing its plan, which the list of steps
 *    below then shows actually happening.
 */

type MessagePart = V0UIMessage["parts"][number];
type FileEditPart = Extract<MessagePart, { type: "data-v0-file-edit" }>;
type AgentActionPart = Extract<MessagePart, { type: "data-v0-agent-action" }>;

/** Consecutive same-kind parts, merged into the row that will represent them. */
type Row =
  | { kind: "single"; part: MessagePart }
  | { kind: "reads"; paths: string[] }
  | { kind: "edits"; parts: FileEditPart[] };

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

function groupParts(parts: readonly MessagePart[]): Row[] {
  const rows: Row[] = [];

  for (const part of parts) {
    const previous = rows.at(-1);

    if (part.type === "data-v0-file-read") {
      if (previous?.kind === "reads") previous.paths.push(...part.data.paths);
      else rows.push({ kind: "reads", paths: [...part.data.paths] });
      continue;
    }

    if (part.type === "data-v0-file-edit") {
      if (previous?.kind === "edits") previous.parts.push(part);
      else rows.push({ kind: "edits", parts: [part] });
      continue;
    }

    rows.push({ kind: "single", part });
  }

  return rows;
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

  const rows = groupParts(withoutPreamble(message.parts));
  // Only the final row can still be in flight, and only while the turn is open.
  const activeIndex = isLive ? rows.length - 1 : -1;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {rows.map((row, index) => (
        <RowView
          isActive={index === activeIndex}
          isStreaming={isStreaming}
          key={`${message.id}-${index}`}
          row={row}
        />
      ))}
    </div>
  );
}

function RowView({
  row,
  isActive,
  isStreaming,
}: {
  row: Row;
  isActive: boolean;
  isStreaming: boolean;
}) {
  if (row.kind === "reads") {
    const count = new Set(row.paths).size;
    return (
      <Activity
        icon={<EyeIcon />}
        isActive={isActive}
        title={count === 1 ? "Read a file" : `Explored ${count} files`}
      >
        {row.paths.join("\n")}
      </Activity>
    );
  }

  if (row.kind === "edits") {
    const count = new Set(row.parts.map((part) => part.data.path)).size;
    return (
      <Activity
        icon={<FileIcon />}
        isActive={isActive}
        title={count === 1 ? "Applied changes to a file" : `Applied changes to ${count} files`}
      >
        {row.parts
          .map((part) =>
            part.data.operation === "rename" && part.data.toPath
              ? `${fileEditLabel(part.data.operation)}: ${part.data.path} → ${part.data.toPath}`
              : `${fileEditLabel(part.data.operation)}: ${part.data.path}`,
          )
          .join("\n")}
      </Activity>
    );
  }

  return (
    <MessagePartView isAssistant isActive={isActive} isStreaming={isStreaming} part={row.part} />
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
    case "data-v0-search":
      return (
        <Activity
          icon={<SearchIcon />}
          isActive={isActive}
          title={part.data.scope === "web" ? "Searched the web" : "Searched the codebase"}
        >
          {part.data.query}
        </Activity>
      );
    case "data-v0-bash":
      return (
        <Activity icon={<TerminalIcon />} isActive={isActive} title="Ran a command">
          {[part.data.command, part.data.output].filter(Boolean).join("\n\n")}
        </Activity>
      );
    case "data-v0-tool-call": {
      const failed = part.data.status === "error";
      return (
        <Activity
          error={failed}
          icon={failed ? <CrossCircleIcon /> : <ToolIcon />}
          isActive={isActive && !failed}
          title={failed ? `${humanize(part.data.name)} failed` : humanize(part.data.name)}
        >
          {formatToolDetails(part.data.input, part.data.output)}
        </Activity>
      );
    }
    case "data-v0-agent-action":
      return (
        <Activity icon={<AgentIcon />} isActive={isActive} title={humanize(part.data.name)}>
          {part.data.data === undefined || isPendingAgentAction(part)
            ? undefined
            : formatValue(part.data.data)}
        </Activity>
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
    <details className="group text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 py-0.5 text-xs font-medium hover:text-foreground [&::-webkit-details-marker]:hidden">
        <SparklesIcon className="size-3.5 shrink-0" />
        <span className={cn(thinking || isActive ? "shimmer-text" : undefined)}>
          {thinking || isActive ? "Thinking" : "Thought for a moment"}
        </span>
        <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 border-l border-border pl-3 text-xs leading-relaxed text-muted-foreground">
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
 * One line of "what the agent did". The detail — paths, queries, command
 * output — is deliberately not on this line; it lives behind the disclosure so
 * the transcript reads as a list of actions rather than a log.
 */
function Activity({
  title,
  icon,
  isActive,
  error = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  isActive: boolean;
  error?: boolean;
  children?: string;
}) {
  const body = children?.trim() ? children : undefined;

  const row = (
    <div className="flex min-w-0 items-center gap-2 py-0.5 text-xs">
      <span
        className={cn(
          "shrink-0 [&>svg]:size-3.5",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-medium",
          error && "text-destructive",
          isActive && !error && "shimmer-text",
        )}
      >
        {title}
      </span>
      {body ? (
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      ) : null}
    </div>
  );

  if (!body) return row;

  return (
    <details className="group min-w-0">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {row}
      </summary>
      <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {body}
      </pre>
    </details>
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
