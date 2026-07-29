"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import "remixicon/fonts/remixicon.css";

import { useTRPC } from "@/trpc/client";
import { UserControl } from "@/components/user-control";
import { Skeleton } from "@/components/ui/skeleton";

// ── Per-card rename logic ────────────────────────────────────────────────────

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnail: string | null;
}

function ProjectCard({ id, name, thumbnail }: ProjectCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep in sync if parent data refreshes
  useEffect(() => { setNameValue(name); }, [name]);

  const renameMutation = useMutation(
    trpc.projects.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
      },
    })
  );

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault(); // don't navigate
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  };

  const commit = (e?: React.MouseEvent | React.FocusEvent) => {
    e?.stopPropagation();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameValue(name);
    } else if (trimmed !== name) {
      renameMutation.mutate({ id, name: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setNameValue(name); setIsEditing(false); }
  };

  const displayName = (renameMutation.isPending ? nameValue : name).replace(/-/g, " ");

  return (
    <div className="flex flex-col group">
      {/* Thumbnail — navigates to project */}
      <Link href={`/projects/${id}`} className="block">
        <div className="relative aspect-video w-full rounded-[8px] bg-[#2A2A28] overflow-hidden transition-colors group-hover:border-[#5A5A5A]">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-folder-open-line text-3xl text-[#5A5A5A]" />
            </div>
          )}
        </div>
      </Link>

      {/* Name row — click pencil or double-click name to rename */}
      <div className="mt-3 flex items-center gap-1.5 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-sm text-white bg-transparent border-b border-white/30 outline-none focus:border-white/60 px-0.5 transition-colors capitalize"
          />
        ) : (
          <span
            className="flex-1 min-w-0 truncate text-xs text-white-85 font-medium group-hover:text-white transition-colors capitalize cursor-text"
            onDoubleClick={startEditing}
            title="Double-click to rename"
          >
            {displayName}
          </span>
        )}
        <button
          type="button"
          onClick={startEditing}
          title="Rename project"
          className="opacity-0 group-hover:opacity-100 shrink-0 text-[#8A8A8A] hover:text-white transition-all"
        >
          <i className="ri-pencil-line text-xs" />
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const trpc = useTRPC();


  useQuery(trpc.usage.status.queryOptions());
  const { data: projects, isLoading: isProjectsLoading } = useQuery(trpc.projects.getMany.queryOptions());





  return (
    <div className="min-h-screen bg-background text-white font-sans flex flex-col  selection:bg-[#F1336E]/30">
      {/* Header */}
      <header className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 text-[14px] text-white/50 font-medium">
          <Image src="/logo.png" alt="Framerate" width={24} height={24} className="mr-2" />
          <Link href="/" className="hover:text-white-85 transition-colors duration-200">
            Home
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white-85">Projects</span>
        </div>
        <UserControl showName={false} />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto py-30 px-6 overflow-y-auto">
        <section>
          <h2 className="text-sm font-medium mb-8 text-white/80">Projects</h2>

          {isProjectsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="aspect-video w-full rounded-xl bg-[#2A2A28]" />
              <Skeleton className="aspect-video w-full rounded-xl bg-[#2A2A28]" />
              <Skeleton className="aspect-video w-full rounded-xl bg-[#2A2A28]" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(projects as { id: string; name: string; sceneImageUrls?: Array<string | { url?: string }> | null; prompts?: any[] | null }[]).map((project) => {
                const thumbnails = Array.isArray(project.sceneImageUrls) ? project.sceneImageUrls : [];
                let thumbnail: string | null = null;
                if (thumbnails.length > 0) {
                  const lastItem = thumbnails[thumbnails.length - 1];
                  thumbnail = typeof lastItem === "string" ? lastItem : (lastItem?.url || null);
                }

                // Fallback to template image if no generated scene images
                if (!thumbnail && Array.isArray(project.prompts) && project.prompts.length > 0) {
                  const firstBlock = project.prompts[0];
                  if (firstBlock?.startFrameUrl) {
                    thumbnail = firstBlock.startFrameUrl;
                  }
                }

                return (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    thumbnail={thumbnail}
                  />
                );
              })}
            </div>
          ) : (
            <div className="w-full py-10 flex flex-col items-center justify-center border border-dashed border-[#3B3B3B] rounded-xl bg-[#2A2A28]/20">
              <i className="ri-folder-shield-2-line text-4xl text-[#5A5A5A] mb-3" />
              <p className="text-sm text-[#8A8A8A]">No projects created yet</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
