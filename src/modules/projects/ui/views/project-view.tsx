"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import "remixicon/fonts/remixicon.css";

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { PROJECT_STAGE } from "@/lib/project-stage";
import { useTRPC } from "@/trpc/client";

import { ProjectHeader } from "../components/project-header";
import { ChatWorkspace } from "../components/v0/chat-workspace";

interface Props {
  projectId: string;
}

/** How often to ask whether the build has moved on and the chat has opened. */
const PREPARING_POLL_MS = 5_000;

/**
 * The site builder.
 *
 * A project's chat is opened by `projects.create`, so reaching this page
 * usually means the build is already running. The two other states are both
 * real: a cinematic build makes its video before v0 is called at all, and a
 * build can fail to start, leaving a project with no chat and a retry to offer.
 */
export const ProjectView = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: project } = useQuery(trpc.projects.getOne.queryOptions({ id: projectId }));
  const { data: workspace, isLoading } = useQuery({
    ...trpc.v0.workspace.queryOptions({ projectId }),
    // Work that happens off this page — the video agent, then the v0 call it
    // hands off to — has no way to tell this tab it finished, so the page asks.
    // The server owns the decision of whether anything is still in flight; the
    // client deciding that for itself is what left it polling for one stage and
    // calling every other one a failure.
    refetchInterval: (query) =>
      query.state.data?.status === "preparing" && query.state.data.waiting
        ? PREPARING_POLL_MS
        : false,
  });

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
      <div className="flex h-screen items-center justify-center gap-2 bg-bg text-sm text-muted-foreground">
        <Loader size={16} /> Loading your build…
      </div>
    );
  }

  if (workspace.status === "preparing") {
    // Not a failure: a cinematic build makes its video first, and the site is
    // opened only once there is a URL to put in v0's prompt.
    if (workspace.waiting) {
      const makingVideo = workspace.stage === PROJECT_STAGE.GENERATING_VIDEO;

      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
          <Loader size={18} />
          <p className="text-sm font-medium text-foreground">
            {makingVideo ? "Creating your video" : "Starting your site"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {makingVideo
              ? "This takes a couple of minutes. Your site starts building the moment it is ready — you can leave this page and come back."
              : "Your video is ready and the build is opening."}
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          {workspace.stage === PROJECT_STAGE.SCENE
            ? "This project has no build yet — something went wrong when it was created."
            : "This build stalled before it opened. Starting it again will reuse the video that was already made."}
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
    <div className="h-screen bg-bg">
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
