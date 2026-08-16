"use client";

import { useFiles } from "@v0-sdk/react/swr";
import { useEffect, useMemo, useState } from "react";

import { Loader } from "@/components/ai-elements/loader";
import { CodeIcon, FileIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { withChatToken } from "./chat-token";

/**
 * The code pane: v0's current files, read-only.
 *
 * Editing used to be possible here and was removed. Files written from this
 * side land outside v0's own history, so the agent's next turn plans against a
 * version of the project that no longer matches what is on disk, and a save
 * racing an in-flight build silently loses. The chat is the way to change the
 * site; this is for reading what it produced.
 */
export function CodeViewer({
  accessToken,
  chatId,
  revision,
}: {
  accessToken: string;
  chatId: string;
  /** Changes whenever v0 finishes a turn, so the file list is refetched. */
  revision: number;
}) {
  const filesQuery = useFiles(withChatToken(`/api/v0/chats/${encodeURIComponent(chatId)}/files`, accessToken));
  // Memoised so the fallback empty array is not a fresh value on every render,
  // which would re-run the selection effect below forever.
  const files = useMemo(() => filesQuery.data?.files ?? [], [filesQuery.data]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    void filesQuery.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  useEffect(() => {
    if (selectedPath && files.some((file) => file.path === selectedPath)) return;
    setSelectedPath(files.find((file) => file.encoding === "utf8")?.path ?? files[0]?.path ?? null);
  }, [files, selectedPath]);

  if (filesQuery.isLoading && files.length === 0) {
    return (
      <EmptyState>
        <Loader size={16} /> Loading files…
      </EmptyState>
    );
  }

  if (filesQuery.error && files.length === 0) {
    return (
      <EmptyState>
        <span className="text-destructive">Could not load the files for this build.</span>
      </EmptyState>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState>
        <CodeIcon className="size-5 opacity-60" />
        <p className="font-medium text-foreground">No code yet</p>
        <p className="max-w-xs text-xs">
          Your site&rsquo;s files will appear here once v0 has written them.
        </p>
      </EmptyState>
    );
  }

  const selectedFile = files.find((file) => file.path === selectedPath);

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="w-52 shrink-0 overflow-y-auto border-r border-border p-2">
        {files.map((file) => (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
              file.path === selectedPath && "bg-accent text-foreground",
            )}
            key={file.path}
            onClick={() => setSelectedPath(file.path)}
            title={file.path}
            type="button"
          >
            <FileIcon className="size-3.5 shrink-0" />
            <span className="truncate">{file.path}</span>
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border px-3">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {selectedFile?.path}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">Read-only</span>
        </div>

        {selectedFile?.encoding === "utf8" ? (
          <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-xs leading-5 text-foreground">
            <code>{selectedFile.content}</code>
          </pre>
        ) : (
          <EmptyState>This file is binary and cannot be shown.</EmptyState>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
