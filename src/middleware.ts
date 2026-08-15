import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/api(.*)",
  "/pricing(.*)",
  "/sso-callback(.*)",
  "/blog(.*)",
  "/privacy",
  "/cookies",
  "/terms",
  "/compliance",
  "/legal",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

/**
 * Back to plain Clerk.
 *
 * Routing a preview's root-relative asset requests to the proxy was attempted
 * here first, and it does not belong here: returning `NextResponse.next()` for
 * an asset skips Clerk, and anything that then renders — a 404 page, an error
 * page — calls `auth()` without context and dies. That turned missing files
 * into 500s across the whole app. The preview rewrite now lives in
 * `next.config.ts` as a `beforeFiles` rewrite, which runs ahead of routing and
 * never interferes with auth.
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
