"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
        <div className="relative aspect-video w-full rounded-xl bg-[#2A2A28] overflow-hidden border border-[#3B3B3B] transition-colors group-hover:border-[#5A5A5A]">
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
            className="flex-1 min-w-0 truncate text-sm text-[#EBEBEB] font-medium group-hover:text-white transition-colors capitalize cursor-text"
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
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());
  const { data: projects, isLoading: isProjectsLoading } = useQuery(trpc.projects.getMany.queryOptions());

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
    })
  );

  const handleDashboardClick = async () => {
    if (projects && projects.length > 0) {
      const latest = projects[0] as { id: string };
      router.push(`/projects/${latest.id}`);
    } else {
      await createProject.mutateAsync({ value: "" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-white font-onest flex flex-col font-mono selection:bg-[#F1336E]/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28]">
        <div className="flex items-center gap-2 text-sm text-[#8A8A8A]">
          <button
            onClick={handleDashboardClick}
            disabled={createProject.isPending}
            className="hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createProject.isPending ? "Creating..." : "Dashboard"}
          </button>
          <i className="ri-arrow-right-s-line" />
          <span className="text-[#EBEBEB]">Projects</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#282828] rounded-full px-3 py-1.5 text-sm text-white">
            <i className="ri-sparkling-2-fill text-white text-sm mr-1.5" />
            {usage ? `${Number(usage.remainingCredits).toLocaleString("en-US")} credits` : "Loading credits..."}
          </div>
          <UserControl showName={false} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto py-12 px-6 overflow-y-auto">
        <section>
          <h2 className="text-xl font-bold mb-6 text-white tracking-wide">Projects</h2>

          {isProjectsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="aspect-video w-full rounded-xl bg-[#2A2A28]" />
              <Skeleton className="aspect-video w-full rounded-xl bg-[#2A2A28]" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-2 gap-6">
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
