import { fetchPreview, type ChatsGetPreviewResponse } from "v0";

import {
  issuePreviewGrant,
  PREVIEW_GRANT_TTL_MS,
  previewGrantCookieName,
  readPreviewGrant,
} from "@/lib/preview-grant";
import { authorizeChat } from "@/lib/v0-authorize";
import { v0 } from "@/lib/v0-client";

/**
 * Same-origin proxy for a v0 preview.
 *
 * v0 gates previews behind an `x-v0-preview-token` request header — the document
 * AND every asset 302 away without it. An <iframe> cannot set headers, and the
 * trusted-preview-hosts allowlist that would remove the need for one is a
 * team-plan feature, so the whole preview is proxied through our own origin with
 * the header attached server-side.
 *
 * The forwarding itself is the SDK's `fetchPreview`, which is the part that is
 * easy to get wrong: it preserves method, body and headers, strips hop-by-hop
 * ones, and — the reason this route was rewritten — handles the two cases where
 * there is nothing to serve yet. A preview that has not booted, or one v0 asks
 * us to re-resolve via `x-v0-preview-refresh`, redirects the iframe to a loading
 * page that retries. Returning a bare 503 instead left a dead "Preview not
 * ready" page in the frame that never recovered, because the build finishing and
 * the preview coming up are seconds apart.
 */

export const dynamic = "force-dynamic";

/** Tokens last hours; re-resolving per asset would be absurd. */
const previewCache = new Map<string, NonNullable<ChatsGetPreviewResponse>>();

async function resolvePreview(chatId: string): Promise<ChatsGetPreviewResponse> {
  const cached = previewCache.get(chatId);
  // Refresh a minute early so a long page load can't straddle expiry.
  if (cached && cached.expiresAt.getTime() - 60_000 > Date.now()) return cached;

  const response = await v0.chats.getPreview({ chatId });
  if (response.error !== undefined) return null;

  const preview = response.data;
  if (preview) previewCache.set(chatId, preview);
  else previewCache.delete(chatId);

  return preview;
}

/**
 * A single catch-all rather than `[chatId]/[[...path]]`: slug[0] is the chat id
 * and the remainder is the upstream path. The loading page deliberately lives on
 * a separate route prefix so it can never collide with a real page in the
 * generated site.
 */
async function handle(request: Request, params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const [chatId, ...path] = slug;

  if (!chatId) return new Response("Missing chat id", { status: 400 });

  // This route lends out our API key, so it is gated: a chat id alone must not
  // be enough to read someone else's unpublished site through our origin.
  //
  // A signed pass (either `?t=` on the document, or the cookie set below) is
  // the only thing the framed page's own asset requests can carry — they arrive
  // through a rewrite, where a Clerk session is not available to check.
  const cookieName = previewGrantCookieName(chatId);
  const granted = readPreviewGrant(
    readCookie(request.headers.get("cookie"), cookieName),
    chatId,
  ) !== null;

  const authorized = granted ? null : await authorizeChat(chatId, request);
  if (authorized && !authorized.ok) {
    // This response is rendered *inside the preview pane*, where a raw
    // `{"message":"Not authenticated."}` reads as the user's own site being
    // broken. Navigations get a page that explains itself; assets keep the
    // machine-readable refusal.
    return request.headers.get("accept")?.includes("text/html")
      ? signedOutPage(authorized.response.status)
      : authorized.response;
  }

  const requestUrl = new URL(request.url);
  const fallbackUrl = new URL(
    `/api/v0-preview-loading/${encodeURIComponent(chatId)}`,
    requestUrl.origin,
  );
  fallbackUrl.searchParams.set("returnTo", requestUrl.pathname + requestUrl.search);

  const upstream = await fetchPreview({
    request,
    preview: await resolvePreview(chatId),
    path,
    fallbackUrl,
    onPreviewRefresh: () => {
      previewCache.delete(chatId);
    },
  });

  const response = await keepNavigationInsidePreview(upstream, chatId);

  if (granted) return response;

  // Just passed the ownership check, so mint the pass this page's assets will
  // present. Issued on any authorized request, not only the document, so a
  // reloaded asset can re-establish it if the cookie has lapsed.
  const withGrant = new Response(response.body, response);
  withGrant.headers.append(
    "set-cookie",
    [
      `${cookieName}=${issuePreviewGrant(chatId, authorized?.ok ? authorized.chat.userId : "")}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${Math.floor(PREVIEW_GRANT_TTL_MS / 1000)}`,
      ...(requestUrl.protocol === "https:" ? ["Secure"] : []),
    ].join("; "),
  );

  return withGrant;
}

export async function GET(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

// The preview is a real Next.js app: server actions, form posts and route
// handlers inside it all need a method other than GET to survive the proxy.
export async function POST(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

export async function PUT(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

export async function HEAD(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

export async function OPTIONS(request: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  return handle(request, ctx.params);
}

/**
 * Keeps the framed site's own navigation inside the proxy.
 *
 * Assets are routed here by `Referer`, which only works while the iframe's URL
 * is still `/api/v0-preview/:chatId/...`. A link to `/about` took it to a bare
 * `/about` on our origin, and from there two things broke: the page's styles
 * 404'd because the referrer no longer named a preview, and a link back to `/`
 * served *this application* inside the frame — Framerate rendered inside
 * Framerate, indistinguishable from the user's own site.
 *
 * So every root-relative link, form target and asset in the HTML is rewritten
 * to sit under the prefix, and a small script keeps client-side navigation
 * there too — a framework router calling `pushState('/about')` would otherwise
 * walk straight back out.
 */
async function keepNavigationInsidePreview(response: Response, chatId: string) {
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const prefix = `/api/v0-preview/${encodeURIComponent(chatId)}`;
  const html = rewriteRootRelative(await response.text(), prefix).replace(
    "</head>",
    `${keepInsideScript(prefix)}</head>`,
  );

  const headers = new Headers(response.headers);
  headers.delete("content-length"); // rewriting changed it
  headers.delete("content-encoding"); // body is now decoded text

  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Prefixes the URLs the browser fetches, and deliberately not the ones a
 * framework router owns.
 *
 * `<a href>` is left exactly as authored. The generated sites use `next/link`,
 * which renders an anchor and then routes the click in JavaScript — rewriting
 * that href pushed the router at `/api/v0-preview/<id>/contact`, a path outside
 * its own route table, so it gave up and did a full page load. That is the
 * blank flash between pages: client-side navigation was working until we broke
 * the address it was given.
 *
 * Anchors that are *not* framework links still need containing, but a
 * navigation is a request like any other, so `next.config.ts` redirects it to
 * the prefix instead. That happens after the click rather than before it, which
 * is what leaves the router's own links untouched.
 */
function rewriteRootRelative(html: string, prefix: string) {
  return html.replace(/<(a|link|script|img|source|form|iframe|video|audio)\b([^>]*)>/gi, (tag, name, attrs) => {
    const isAnchor = String(name).toLowerCase() === "a";

    const rewritten = String(attrs).replace(
      // `/x` but never `//host` — a protocol-relative URL is another origin.
      /\b(href|src|action)=(["'])\/(?!\/)/gi,
      (attribute, key, quote) =>
        isAnchor && String(key).toLowerCase() === "href"
          ? attribute
          : `${key}=${quote}${prefix}/`,
    );

    return `<${name}${rewritten}>`;
  });
}

function keepInsideScript(prefix: string) {
  return `<script>(function(){
var P=${JSON.stringify(prefix)};
function fix(u){if(typeof u!=="string")return u;if(u.indexOf(P)===0)return u;if(u.charAt(0)==="/"&&u.charAt(1)!=="/")return P+u;return u;}
function report(){try{parent.postMessage({type:"v0-preview-path",path:location.pathname+location.search+location.hash},location.origin);}catch(e){}}
var p=history.pushState,r=history.replaceState;
history.pushState=function(s,t,u){var v=p.call(this,s,t,u==null?u:fix(String(u)));report();return v;};
history.replaceState=function(s,t,u){var v=r.call(this,s,t,u==null?u:fix(String(u)));report();return v;};
addEventListener("popstate",report);
addEventListener("hashchange",report);
report();
})();</script>`;
}

/** Shown in the frame when the session has lapsed, instead of a JSON blob. */
function signedOutPage(status: number) {
  const expired = status === 401;

  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        align-items: center; background: #181818; display: flex;
        flex-direction: column; gap: 8px; justify-content: center;
        font: 14px system-ui, sans-serif; text-align: center; padding: 0 24px;
      }
      p { color: rgba(255,255,255,.5); margin: 0; max-width: 22rem; }
      strong { color: #fff; font-weight: 500; }
      button {
        margin-top: 8px; padding: 6px 12px; border-radius: 6px; cursor: pointer;
        background: #fff; color: #181818; border: 0; font: inherit;
      }
    </style>
  </head>
  <body>
    <strong>${expired ? "Your session expired" : "This preview isn\u2019t available"}</strong>
    <p>${
      expired
        ? "Sign in again and this preview will come straight back \u2014 your site is safe."
        : "This build could not be found for your account."
    }</p>
    ${expired ? '<button onclick="parent.location.reload()">Reload</button>' : ""}
  </body>
</html>`,
    { status, headers: { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" } },
  );
}

function readCookie(header: string | null, name: string) {
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}
