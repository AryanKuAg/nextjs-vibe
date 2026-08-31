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
  await queryClient.prefetchQuery(trpc.messages.getMany.queryOptions({
    projectId,
    stage: "SITE",
  }));
  await queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({
    id: projectId,
  }));

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
