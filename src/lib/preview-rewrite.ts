import type { NextRequest } from "next/server";

/**
 * Routes a preview's sub-resource requests to the preview proxy.
 *
 * The site v0 hosts is a Next.js app that emits root-relative URLs — its HTML
 * asks for `/_next/static/...`, and its runtime builds more of those URLs after
 * load. Inside our same-origin iframe those resolve against the builder's own
 * origin, where `/_next` belongs to *this* app, so the preview would load its
 * document and then fail to fetch a single chunk. Rewriting the HTML does not
 * fix it, because the chunk URLs that matter are constructed in JavaScript.
 *
 * The one thing that reliably distinguishes those requests is where they came
 * from: a same-origin iframe sends the full document URL as `Referer` under the
 * default referrer policy, so a request refered from `/api/v0-preview/:chatId`
 * is the preview asking for one of its own files, and gets forwarded there.
 *
 * The robust alternative is to give previews their own hostname, which is what
 * the upstream v0-clone does by running its proxy as a second app. That needs a
 * wildcard DNS record and certificate; this needs nothing, and degrades to
 * "asset served by the wrong app" rather than anything unsafe — the proxy still
 * checks ownership on every request it handles.
 */
export function previewProxyRewrite(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl;

  // Already addressed to the proxy, or to the holding page it falls back to.
  if (pathname.startsWith("/api/v0-preview")) return null;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  let refererUrl: URL;
  try {
    refererUrl = new URL(referer);
  } catch {
    return null;
  }

  // Only our own iframe counts. A cross-origin referrer is either spoofed or
  // irrelevant, and cross-origin policies would have stripped the path anyway.
  if (refererUrl.origin !== request.nextUrl.origin) return null;

  const chatId = /^\/api\/v0-preview\/([^/?#]+)/.exec(refererUrl.pathname)?.[1];
  if (!chatId) return null;

  const rewritten = request.nextUrl.clone();
  rewritten.pathname = `/api/v0-preview/${chatId}${pathname}`;
  return rewritten;
}
