import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';

/**
 * `v0.publish` runs the customer's own `npm install` + `next build` inside an
 * E2B sandbox and waits for it, so this handler is long-running even though
 * every other procedure on it answers in milliseconds.
 *
 * 300s is the ceiling on Vercel's Hobby plan and the default everywhere else.
 * Pro/Enterprise can raise this to 800 — worth doing, because publishSiteToR2
 * allows 5 minutes for the install and 5 more for the build, so a heavy site
 * can legitimately need longer than 300s and would otherwise be killed with a
 * FUNCTION_INVOCATION_TIMEOUT instead of a useful build error.
 *
 * Duration is billed on active CPU, not wall clock, so a high ceiling costs
 * nothing on the procedures that return immediately.
 */
export const maxDuration = 300;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
export { handler as GET, handler as POST };
