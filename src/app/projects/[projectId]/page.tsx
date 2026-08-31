import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { dehydrate } from "@tanstack/react-query";
import { HydrationBoundary } from "@/components/query-hydration-boundary";

import { getQueryClient, trpc } from "@/trpc/server";

import { ProjectView } from "@/modules/projects/ui/views/project-view";

interface Props {
  params: Promise<{
    projectId: string;
  }>
};

const Page = async ({ params }: Props) => {
  const { projectId } = await params;

  const queryClient = getQueryClient();
  // The workspace round-trips to v0 for the chat and its transcript; prefetching
  // it here means the builder renders with the conversation already in place
  // instead of flashing a loader on every navigation.
  await Promise.all([
    queryClient.prefetchQuery(trpc.v0.workspace.queryOptions({ projectId })),
    queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({ id: projectId })),
  ]);

  return ( 
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<p>Error!</p>}>
        <Suspense fallback={<p>Loading Project...</p>}>
          <ProjectView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
};
 
export default Page;
