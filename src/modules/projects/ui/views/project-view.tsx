"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import "remixicon/fonts/remixicon.css";

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { useTRPC } from "@/trpc/client";

import { ProjectHeader } from "../components/project-header";
import { ChatWorkspace } from "../components/v0/chat-workspace";

interface Props {
  projectId: string;
}

/**
 * The site builder.
 *
 * A project's chat is opened by `projects.create`, so reaching this page means
 * the build is already running — unless it failed to start, which leaves a
 * project with no chat and a retry to offer.
 */
export const ProjectView = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: project } = useQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
  const { data: workspace, isLoading } = useQuery(
    trpc.v0.workspace.queryOptions({ projectId }),
  );

  const retryBuild = useMutation(
    trpc.v0.retryBuild.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.v0.workspace.queryOptions({ projectId }));
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!project) return null;

  if (isLoading || !workspace) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-bg font-onest text-sm text-muted-foreground">
        <Loader size={16} /> Loading your build…
      </div>
    );
  }

  if (workspace.status === "preparing") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center font-onest">
        <p className="max-w-sm text-sm text-muted-foreground">
          This project has no build yet — something went wrong when it was created.
        </p>
        <Button
          disabled={retryBuild.isPending}
          onClick={() => retryBuild.mutate({ projectId })}
          size="sm"
        >
          {retryBuild.isPending ? <Loader size={14} /> : null}
          {retryBuild.isPending ? "Starting…" : "Start the build"}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg font-onest">
      <ChatWorkspace
        accessToken={workspace.accessToken}
        chat={workspace.chat}
        key={workspace.chat.id}
        messages={workspace.messages}
        openingPrompt={workspace.openingPrompt}
        previewOrigin={workspace.previewOrigin}
        projectId={projectId}
        publishedUrl={workspace.publishedUrl}
        title={project.name}
        titleSlot={
          <ErrorBoundary fallback={<p className="text-xs text-destructive">Header error</p>}>
            <Suspense fallback={null}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>
        }
        accountSlot={<UserControl />}
      />
    </div>
  );
};
