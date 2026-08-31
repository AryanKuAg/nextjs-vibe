import { usageRouter } from '@/modules/usage/server/procedures';
import { projectsRouter } from '@/modules/projects/server/procedures';
import { v0Router } from '@/modules/v0/server/procedures';

import { createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  usage: usageRouter,
  projects: projectsRouter,
  v0: v0Router,
});
// export type definition of API
export type AppRouter = typeof appRouter;
