import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

import { chatIdFromHost, previewSubdomain } from '@/lib/preview-host';

/**
 * The chat a request belongs to, judged by the page that asked for it.
 *
 * Used only when previews share this app's origin. `next.config` rewrites
 * cannot claim `/_next/*` — Next reserves it — so a preview's fonts and
 * runtime-loaded chunks arrived at this application's own root and 404'd. Those
 * URLs are built inside CSS and JavaScript, well past anything HTML rewriting
 * can reach, which leaves the referrer as the only thing identifying them.
 */
const PREVIEW_PATH = /\/api\/v0-preview\/([^/?#]+)/;

function previewChatIdFromReferer(referer: string | null, hosts: string[]) {
  if (!referer) return null;

  try {
    const url = new URL(referer);
    // Host rather than origin. `request.nextUrl.origin` is the origin the
    // container was reached on, which behind a CDN in front of Cloud Run is
    // neither the scheme nor the hostname the browser used — so the comparison
    // never matched and this rewrite silently stopped happening in production.
    // The preview's `/_next/*` chunks and the fonts named inside its CSS went
    // to this application's own root and 404'd, with nothing in the log to say
    // why. Clerk derives its own URLs from the forwarded headers for the same
    // reason.
    if (!hosts.includes(url.host.toLowerCase())) return null;
    return PREVIEW_PATH.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * The hostnames a referer may legitimately carry.
 *
 * All three, because which one holds the address the user actually typed
 * depends on what sits in front: a Cloud Run domain mapping passes it straight
 * through as `host`, while a proxy pointed at the service URL leaves `host`
 * internal and puts the real one in `x-forwarded-host`.
 */
function requestHosts(request: NextRequest): string[] {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  return [forwarded, request.headers.get("host"), request.nextUrl.host]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase());
}

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
 * Paths this app serves itself and Clerk has no business inspecting. The
 * matcher used to exclude them, but it has to see everything now: a preview
 * host asks for `/_next/*` too, and `next.config` rewrites cannot claim that
 * prefix — Next reserves it, so middleware is the only place the request can
 * be caught.
 */
const STATIC_FILE = /\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)$/i;

function isAppAsset(pathname: string) {
  return pathname.startsWith("/_next/") || STATIC_FILE.test(pathname);
}

/**
 * Back to plain Clerk for this application.
 *
 * Routing a preview's root-relative asset requests to the proxy was attempted
 * here first, and it does not belong here: returning `NextResponse.next()` for
 * an asset skips Clerk, and anything that then renders — a 404 page, an error
 * page — calls `auth()` without context and dies. That turned missing files
 * into 500s across the whole app. The preview rewrite now lives in
 * `next.config.ts` as a `beforeFiles` rewrite, which runs ahead of routing and
 * never interferes with auth.
 */
const withClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // A preview's own hostname. The whole origin belongs to one site, so every
  // path on it — including `/_next/*` — is that site's and goes to the proxy.
  // No Clerk: the route authorises with the signed pass instead, which is the
  // only credential these requests can carry.
  const previewChatId = chatIdFromHost(request.headers.get("host"));
  if (previewChatId) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = `/api/v0-preview/${previewSubdomain(previewChatId)}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // Sharing an origin: anything refered from a preview belongs to that preview,
  // not to this app.
  if (!request.nextUrl.pathname.startsWith("/api/v0-preview")) {
    const refererChatId = previewChatIdFromReferer(
      request.headers.get("referer"),
      requestHosts(request),
    );

    if (refererChatId) {
      const rewritten = request.nextUrl.clone();
      rewritten.pathname = `/api/v0-preview/${refererChatId}${request.nextUrl.pathname}`;
      return NextResponse.rewrite(rewritten);
    }
  }

  if (isAppAsset(request.nextUrl.pathname)) return NextResponse.next();

  return withClerk(request, event);
}

export const config = {
  // Everything, so a preview host's `/_next/*` requests can be caught. Anything
  // that turns out to be this app's own asset returns a line later, before any
  // auth work happens.
  matcher: ['/(.*)'],
};
