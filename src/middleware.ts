import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

import { previewProxyRewrite } from '@/lib/preview-rewrite';

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
 * Paths Clerk has no business inspecting: this app's own build output and
 * static assets. This used to be expressed as an exclusion in `config.matcher`,
 * but the matcher now has to let everything through so a preview's asset
 * requests can reach `previewProxyRewrite` — those arrive as `/_next/...` and
 * `/*.js`, exactly what the old pattern filtered out. The set is unchanged;
 * only the place it is applied moved.
 */
const STATIC_FILE = /\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)$/i;

function isAppAsset(pathname: string) {
  return pathname.startsWith("/_next/") || STATIC_FILE.test(pathname);
}

/**
 * The preview rewrite happens INSIDE the Clerk handler, not before it.
 *
 * `auth()` only works on a request that Clerk itself processed — it reads
 * context that `clerkMiddleware` attaches. Rewriting ahead of Clerk sent the
 * proxy a request it had never seen, so every asset died on "auth() was called
 * but Clerk can't detect usage of clerkMiddleware()", which is why the preview
 * rendered as unstyled HTML: its CSS and JS were all 500s.
 */
const withClerk = clerkMiddleware(async (auth, req) => {
  const rewrite = previewProxyRewrite(req);
  if (rewrite) return NextResponse.rewrite(rewrite);

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // Our own assets skip Clerk exactly as they always did. A preview's assets
  // look identical by path, so they are identified by referrer first and handed
  // to Clerk, which performs the rewrite above.
  if (isAppAsset(request.nextUrl.pathname) && previewProxyRewrite(request) === null) {
    return NextResponse.next();
  }

  return withClerk(request, event);
}

export const config = {
  // Everything, so the preview rewrite can see asset requests. Requests that
  // turn out to be this app's own assets are returned one line later, before
  // any auth work happens.
  matcher: ['/(.*)'],
};
