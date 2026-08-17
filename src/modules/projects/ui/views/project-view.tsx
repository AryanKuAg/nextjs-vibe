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
 * A project's v0 chat is opened by `projects.create`, so reaching this page
 * means the build is already running and the workspace can render it straight
 * away. The only other state is the failure case: creation succeeded but v0 did
 * not, leaving a project with no chat and a retry to offer.
 */
export const ProjectView = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: project } = useQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
  const { data: workspace, isLoading } = useQuery(trpc.v0.workspace.queryOptions({ projectId }));

  const retryBuild = useMutation(
    trpc.v0.retryBuild.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.v0.workspace.queryOptions({ projectId }));
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!project) return null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-bg text-sm text-muted-foreground">
        <Loader size={16} /> Loading your build…
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="text-sm text-muted-foreground">
          This project has no build yet — v0 could not be reached when it was created.
        </p>
        <Button disabled={retryBuild.isPending} onClick={() => retryBuild.mutate({ projectId })} size="sm">
          {retryBuild.isPending ? <Loader size={14} /> : null}
          {retryBuild.isPending ? "Starting…" : "Start the build"}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg">
      <ChatWorkspace
        accessToken={workspace.accessToken}
        chat={workspace.chat}
        key={workspace.chat.id}
        messages={workspace.messages}
        previewOrigin={workspace.previewOrigin}
        projectId={projectId}
        publishedUrl={workspace.publishedUrl}
        title={project.name}
        toolbar={
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <ErrorBoundary fallback={<p className="text-xs text-destructive">Header error</p>}>
              <Suspense fallback={null}>
                <ProjectHeader projectId={projectId} />
              </Suspense>
            </ErrorBoundary>
            <div className="ml-auto">
              <UserControl />
            </div>
          </div>
        }
      />
    </div>
  );
};
