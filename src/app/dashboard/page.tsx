"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Smart dashboard redirect page.
 * - Used as the returnUrl after Dodo Payments checkout.
 * - If the user has existing projects → navigate to the most recent one.
 * - If no projects yet → create a new one and navigate to it.
 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery(trpc.projects.getMany.queryOptions());

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.replace(`/projects/${data.id}`);
      },
    })
  );

  useEffect(() => {
    if (isLoading) return;

    if (projects && projects.length > 0) {
      const latest = projects[0] as { id: string };
      router.replace(`/projects/${latest.id}`);
    } else {
      createProject.mutate({ value: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, projects]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <i className="ri-loader-4-line text-3xl text-white animate-spin" />
        <p className="text-sm text-[#8A8A8A] font-onest">Taking you to your dashboard...</p>
      </div>
    </div>
  );
}
