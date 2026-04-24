import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/api(.*)",
  "/pricing(.*)",
  "/sso-callback(.*)",
  "/privacy",
  "/cookies",
  "/terms",
  "/compliance",
]);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const host = req.headers.get("host");

  // Redirect www to non-www
  if (host === "www.framerate.space") {
    return NextResponse.redirect(`https://framerate.space${url.pathname}${url.search}`, 301);
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
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
