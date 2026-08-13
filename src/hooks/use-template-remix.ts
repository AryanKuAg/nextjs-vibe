"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { TEMPLATE_ASIS_PROMPT } from "@/lib/templates/registry";

/**
 * Shared "remix this template" flow: creates a project seeded with the template
 * and hands the project page a pending prompt to auto-submit on mount.
 */
export const useTemplateRemix = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const trpc = useTRPC();
  const router = useRouter();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}?builderAutoSubmit=true`);
      },
      onError: (error) => {
        setIsRedirecting(false);
        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
          return;
        }
        toast.error(error.message, { duration: Infinity });
      },
    })
  );

  const isPending = createProject.isPending || isRedirecting;

  const remix = async (templateId: string | null) => {
    if (!templateId || isPending) return;

    // No description means "give me this template exactly" — a valid request the
    // code agent recognises and satisfies without rewriting anything.
    const value = TEMPLATE_ASIS_PROMPT;

    setIsRedirecting(true);
    // The project page reads these on mount and auto-submits the first build.
    sessionStorage.setItem("pending_builder_prompt", value);
    sessionStorage.setItem("pending_model", "google/gemini-3.5-flash-lite");

    try {
      await createProject.mutateAsync({ value, templateId });
    } catch {
      // Handled in onError.
    }
  };

  return { remix, isPending };
};
