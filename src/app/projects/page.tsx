"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";
import { useRouter } from "next/navigation";

import { useTRPC } from "@/trpc/client";
import { UserControl } from "@/components/user-control";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());
  const { data: projects, isLoading: isProjectsLoading } = useQuery(trpc.projects.getMany.queryOptions());

  return (
    <div className="min-h-screen bg-[#1C1C1C] text-white font-inconsolata flex flex-col font-mono selection:bg-[#F1336E]/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28]">
        <div className="flex items-center gap-2 text-sm text-[#8A8A8A]">
          <Link href="/" className="hover:text-white transition-colors duration-200">
            Dashboard
          </Link>
          <i className="ri-arrow-right-s-line" />
          <span className="text-[#EBEBEB]">Projects</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#2A2A28] rounded-[8px] px-3 py-1.5 text-sm text-white">
            {usage ? `${usage.remainingPoints.toLocaleString()}/${usage.maxPoints.toLocaleString()} credits left` : "Loading credits..."}
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
              {projects.map((project: any) => {
                  const thumbnails = Array.isArray(project.sceneImageUrls) ? project.sceneImageUrls : [];
                  const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1] : null;

                  return (
                    <Link href={`/projects/${project.id}`} key={project.id} className="flex flex-col group cursor-pointer block">
                        <div className="relative aspect-video w-full rounded-xl bg-[#2A2A28] overflow-hidden border border-[#3B3B3B] transition-colors group-hover:border-[#5A5A5A]">
                            {thumbnail ? (
                                <img src={thumbnail} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <i className="ri-folder-open-line text-3xl text-[#5A5A5A]" />
                                </div>
                            )}
                        </div>
                        <span className="mt-3 text-sm text-[#EBEBEB] font-medium group-hover:text-white transition-colors capitalize">
                            {project.name.replace(/-/g, ' ')}
                        </span>
                    </Link>
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
