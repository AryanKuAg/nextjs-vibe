"use client";

import type { V0UIMessage } from "@v0-sdk/react";
import type { ReactNode } from "react";

import { Response } from "@/components/ai-elements/response";
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
 * v0 streams a turn as typed parts rather than a blob of text: reasoning, file
 * reads and edits, searches, shell commands, tool calls, agent actions. Each
 * gets a one-line "activity" row that expands only when there is output worth
 * reading, which is what makes a long build legible while it is still running.
 */

type MessagePart = V0UIMessage["parts"][number];
type FileEditPart = Extract<MessagePart, { type: "data-v0-file-edit" }>;
type AgentActionPart = Extract<MessagePart, { type: "data-v0-agent-action" }>;

export function MessageParts({
  message,
  isStreaming = false,
}: {
  message: V0UIMessage;
  isStreaming?: boolean;
}) {
  const isAssistant = message.role !== "user";

  return (
    <div
      className={
        isAssistant
          ? "flex w-full min-w-0 flex-col gap-2.5"
          : "flex min-w-0 flex-col gap-2"
      }
    >
      {message.parts.map((part, index) => (
        <MessagePartView
          isAssistant={isAssistant}
          isStreaming={isAssistant && isStreaming}
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
  isStreaming,
}: {
  part: MessagePart;
  isAssistant: boolean;
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
      return <ThinkingPart isStreaming={isStreaming} part={part} />;
    case "file":
      return (
        <Activity detail={part.filename ?? part.url} icon={<FileIcon />} title="Attached file" />
      );
    case "data-v0-file-read":
      return (
        <Activity
          detail={part.data.paths.join(", ")}
          icon={<EyeIcon />}
          title={part.data.paths.length === 1 ? "Read file" : `Read ${part.data.paths.length} files`}
        />
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
          title={fileEditLabel(part.data.operation)}
        />
      );
    case "data-v0-search":
      return (
        <Activity
          detail={part.data.query}
          icon={<SearchIcon />}
          title={part.data.scope === "web" ? "Searched the web" : "Searched the codebase"}
        />
      );
    case "data-v0-bash":
      return (
        <Activity detail={part.data.command} icon={<TerminalIcon />} title="Ran command">
          {part.data.output}
        </Activity>
      );
    case "data-v0-tool-call": {
      const Icon = part.data.status === "error" ? CrossCircleIcon : ToolIcon;
      return (
        <Activity
          detail={humanize(part.data.name)}
          error={part.data.status === "error"}
          icon={<Icon />}
          title={part.data.status === "error" ? "Tool failed" : "Used tool"}
        >
          {formatToolDetails(part.data.input, part.data.output)}
        </Activity>
      );
    }
    case "data-v0-agent-action":
      return (
        <Activity detail={part.data.summary} icon={<AgentIcon />} title={humanize(part.data.name)}>
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
  isStreaming,
}: {
  part: Extract<MessagePart, { type: "reasoning" }>;
  isStreaming: boolean;
}) {
  if (!part.text) return null;

  return (
    <details className="group text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 py-0.5 text-xs font-medium hover:text-foreground [&::-webkit-details-marker]:hidden">
        <SparklesIcon className="size-3.5 shrink-0" />
        <span>Thought for a moment</span>
        <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 border-l border-border pl-3 text-xs leading-relaxed text-muted-foreground">
        <Markdown isStreaming={isStreaming && part.state === "streaming"}>{part.text}</Markdown>
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

function Activity({
  title,
  detail,
  icon,
  error = false,
  children,
}: {
  title: string;
  detail?: string;
  icon: ReactNode;
  error?: boolean;
  children?: string;
}) {
  const row = (
    <div className="flex min-w-0 items-center gap-2 py-0.5 text-xs">
      <span
        className={cnIcon(error)}
      >
        {icon}
      </span>
      <span className={error ? "font-medium text-destructive" : "font-medium"}>{title}</span>
      {detail ? (
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {detail}
        </span>
      ) : null}
      {children ? (
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      ) : null}
    </div>
  );

  if (!children) return row;

  return (
    <details className="group min-w-0">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {row}
      </summary>
      <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {children}
      </pre>
    </details>
  );
}

function cnIcon(error: boolean) {
  return error
    ? "shrink-0 text-destructive [&>svg]:size-3.5"
    : "shrink-0 text-muted-foreground [&>svg]:size-3.5";
}

function fileEditLabel(operation: FileEditPart["data"]["operation"]) {
  const labels = {
    create: "Created file",
    update: "Updated file",
    delete: "Deleted file",
    rename: "Renamed file",
    patch: "Patched file",
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
