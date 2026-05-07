"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";

import { useTRPC } from "@/trpc/client";


interface Props {
  projectId: string;
}

export const ProjectHeader = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: project } = useSuspenseQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync if project changes externally
  useEffect(() => {
    setNameValue(project.name);
  }, [project.name]);

  const renameMutation = useMutation(
    trpc.projects.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
      },
    })
  );

  const startEditing = () => {
    setIsEditing(true);
    // Focus the input on next tick after it renders
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameValue(project.name); // revert if empty
    } else if (trimmed !== project.name) {
      renameMutation.mutate({ id: projectId, name: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setNameValue(project.name);
      setIsEditing(false);
    }
  };

  return (
    <header className="p-2.5 flex justify-between items-center border-b h-[56px] shrink-0">
      <div className="flex items-center gap-3 pl-2">
        <Link href="/">
          <Image src="/logo.png" alt="framerate" width={24} height={24} />
        </Link>

        {isEditing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-sm text-white bg-transparent border-b border-white/30 outline-none focus:border-white/60 px-1 min-w-0 w-[160px] max-w-[240px] transition-colors"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            title="Click to rename"
            className="text-sm text-white hover:text-white/70 transition-colors truncate max-w-[200px]"
          >
            {renameMutation.isPending ? nameValue : project.name}
          </button>
        )}
      </div>
    </header>
  );
};
