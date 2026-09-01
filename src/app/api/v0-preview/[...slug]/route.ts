import { fetchPreview, type ChatsGetPreviewResponse } from "v0";

import { chatIdFromHost } from "@/lib/preview-host";

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

/** Breaks the redirect loop when v0 asks us to re-resolve a preview. */
const WAIT_MARKER = "__v0_wait";

/** Tokens last hours; re-resolving per asset would be absurd. */
const previewCache = new Map<string, NonNullable<ChatsGetPreviewResponse>>();

async function resolvePreview(chatId: string): Promise<ChatsGetPreviewResponse> {
  const cached = previewCache.get(chatId);
  // Refresh a minute early so a long page load can't straddle expiry.
  if (cached && cached.expiresAt.getTime() - 60_000 > Date.now()) return cached;

  const response = await v0.chats.getPreview({ chatId });

  // Both ways of having nothing to serve end the same on screen: the frame sits
  // on the holding page, retrying every two seconds, until the builder's stall
  // timer gives up and reports that the preview is not running. They were also
  // identical in the log, which recorded neither — so a v0 that was failing
  // outright and a sandbox that was merely asleep could not be told apart from
  // a deployment. They are named separately here for exactly that.
  if (response.error !== undefined) {
    console.error(`[build] getPreview failed for ${chatId}:`, response.error);
    return null;
  }

  const preview = response.data;
  if (preview) {
    previewCache.set(chatId, preview);
  } else {
    console.warn(`[build] no preview for ${chatId} yet — its sandbox is not up`);
    previewCache.delete(chatId);
  }

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
  const [pathChatId, ...path] = slug;

  // On its own host the site owns the whole origin, so there is no prefix to
  // add to anything — the one fact that decides how its HTML is treated. The
  // subdomain is the authority there; the path segment is only its encoding.
  const hostChatId = chatIdFromHost(request.headers.get("host"));
  const ownsOrigin = hostChatId !== null;
  const chatId = hostChatId ?? pathChatId;

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

  const requestUrl = publicUrl(request);
  const selfUrl = new URL(requestUrl);
  selfUrl.searchParams.delete(WAIT_MARKER);

  const builder = builderOrigin(requestUrl, ownsOrigin);

  const preview = await resolvePreview(chatId);

  // Nothing to serve yet, or v0 just asked us to re-resolve. Either way the
  // frame gets a page that retries rather than an error it cannot recover from.
  // The marker is what stops a refresh signal becoming a tight redirect loop.
  if (!preview || requestUrl.searchParams.has(WAIT_MARKER)) {
    return withGrant(holdingPage(selfUrl.toString(), builder), {
      chatId,
      cookieName,
      granted,
      requestUrl,
    });
  }

  const waitUrl = new URL(selfUrl);
  waitUrl.searchParams.set(WAIT_MARKER, "1");

  const upstream = await fetchPreview({
    request,
    preview,
    path,
    fallbackUrl: waitUrl,
    onPreviewRefresh: () => {
      previewCache.delete(chatId);
    },
  });

  const placeholder = await replaceUpstreamPlaceholder(upstream, waitUrl, builder);

  // On its own host nothing needs rewriting — the site already owns the origin.
  const response =
    placeholder ??
    (ownsOrigin
      ? await addPathReporter(upstream, builder)
      : await keepNavigationInsidePreview(upstream, chatId, builder));

  return withGrant(response, {
    chatId,
    cookieName,
    granted,
    requestUrl,
    userId: authorized?.ok ? authorized.chat.userId : "",
  });
}

/**
 * The URL the browser actually asked for.
 *
 * A preview host reaches this route through a middleware rewrite, and behind a
 * rewrite `request.url` carries this application's own internal origin rather
 * than the hostname in the address bar. Every URL we hand back for the browser
 * to follow therefore has to be rebuilt from the Host header.
 *
 * Getting this wrong was not subtle. The holding page shown while v0 boots a
 * sandbox refreshes itself at `selfUrl`, which came out as
 * `http://localhost:3000/` — this application's home page. So a preview that
 * was merely still starting redirected the frame to Framerate two seconds
 * later, and "open in new tab" did the same: the user was shown our marketing
 * site where their own site should have been.
 *
 * It also decides whether the grant cookie is marked Secure, which behind TLS
 * termination was reading the internal `http:` and quietly leaving it off.
 */
function publicUrl(request: Request): URL {
  const url = new URL(request.url);

  const host = request.headers.get("host");
  if (host) url.host = host;

  // The browser's scheme, not the one this hop happens to be using.
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "https" || forwarded === "http") url.protocol = `${forwarded}:`;

  return url;
}

/** Browsers treat these as secure origins even over plain http. */
function isLocalhost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/**
 * Mints the pass this page's own requests will present. Issued on any
 * authorized request, not only the document, so a reloaded asset can
 * re-establish it if the cookie has lapsed.
 */
function withGrant(
  response: Response,
  context: {
    chatId: string;
    cookieName: string;
    granted: boolean;
    requestUrl: URL;
    userId?: string;
  },
) {
  if (context.granted) return response;

  // The preview is framed by a builder on a different site, so every request it
  // makes for its own stylesheet, chunk and font is a third-party one. Three
  // attributes are needed together and none of them is optional:
  //
  //   SameSite=Lax  never travels with a framed page's subresources at all, so
  //                 they arrive unauthenticated and answer 401 — the site
  //                 renders as raw unstyled HTML.
  //   SameSite=None fixes that only where third-party cookies are allowed.
  //                 Chrome blocks them by default now and refuses both to store
  //                 and to send this one, so the fix held in a top-level tab and
  //                 changed nothing inside the builder. That is exactly the
  //                 "loads externally, not in the builder" split.
  //   Partitioned   is the mechanism for this case (CHIPS): a third-party cookie
  //                 keyed to the embedding site, which survives that blocking.
  //                 It requires Secure and Path=/.
  //
  // Localhost counts as a secure context, so this holds over plain http in dev.
  const secure = context.requestUrl.protocol === "https:" || isLocalhost(context.requestUrl.hostname);

  const withCookie = new Response(response.body, response);
  withCookie.headers.append(
    "set-cookie",
    [
      `${context.cookieName}=${issuePreviewGrant(context.chatId, context.userId ?? "")}`,
      "Path=/",
      "HttpOnly",
      `Max-Age=${Math.floor(PREVIEW_GRANT_TTL_MS / 1000)}`,
      // Falling back to Lax rather than dropping the cookie: over plain http on
      // a non-local host SameSite=None would be rejected outright, and Lax at
      // least keeps the same-origin path proxy working.
      ...(secure ? ["SameSite=None", "Secure", "Partitioned"] : ["SameSite=Lax"]),
    ].join("; "),
  );

  return withCookie;
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
 * Where the builder is, so the framed page can talk back to it and no further.
 *
 * `NEXT_PUBLIC_APP_URL` is baked in at build time and names exactly one host,
 * and this deployment answers on two — the apex and `www`. A user on
 * `www.framerate.space` was handed a script addressing `https://framerate.space`,
 * so the browser dropped every `postMessage` for origin mismatch. The preview
 * loaded in full, all 119 requests of it, and the pane still sat on "Preview
 * isn’t running" — because the one message that lifts that overlay never
 * arrived.
 *
 * Sharing an origin, the request is the authority: the frame and the builder
 * are the same host by construction, whichever host that turns out to be. On a
 * dedicated preview host they are two different hosts and only the configured
 * app URL can name the parent.
 */
function builderOrigin(requestUrl: URL, ownsOrigin: boolean) {
  if (!ownsOrigin) return requestUrl.origin;

  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").origin;
  } catch {
    return null;
  }
}

/**
 * On a dedicated host nothing needs rewriting; the frame only has to say where
 * it is, so the builder's address bar and Back button mean something.
 */
async function addPathReporter(response: Response, builder: string | null) {
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const html = (await response.text()).replace("</head>", `${pathReporterScript(builder)}</head>`);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");

  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

function pathReporterScript(builder: string | null) {
  return `<script>(function(){
var T=${JSON.stringify(builder ?? "*")};
function report(){try{parent.postMessage({type:"v0-preview-path",path:location.pathname+location.search+location.hash},T);}catch(e){}}
var p=history.pushState,r=history.replaceState;
history.pushState=function(){var v=p.apply(this,arguments);report();return v;};
history.replaceState=function(){var v=r.apply(this,arguments);report();return v;};
addEventListener("popstate",report);
addEventListener("hashchange",report);
addEventListener("message",function(e){if(e.source===parent&&e.data&&e.data.type==="v0-preview-go")history.go(e.data.delta|0);});
document.addEventListener("click",function(e){
var t=e.target;if(!t||!t.closest)return;var a=t.closest("a[href]");if(!a)return;
try{parent.postMessage({type:"v0-preview-navigate",href:new URL(a.getAttribute("href"),location.href).href},T);}catch(_){}
},true);
report();
})();</script>`;
}

/**
 * The upstream's own "nothing generated yet" page.
 *
 * A chat with no generated version still resolves to a preview URL, and what
 * that URL serves is the vendor's branded placeholder. Proxying it verbatim put
 * their branding inside our builder, which is the one thing this app must never
 * do. The frame gets our holding page instead, which also retries — so when the
 * site does come up it appears on its own.
 */
function isUpstreamPlaceholder(html: string): boolean {
  return /generation will show here/i.test(html);
}

/**
 * Returns our holding page when the upstream answered with its placeholder, and
 * null when it answered with a real page. Reading the body here is why the two
 * rewriters below take the untouched response: only one of the three ever runs.
 */
async function replaceUpstreamPlaceholder(
  response: Response,
  retryTo: URL,
  builder: string | null,
): Promise<Response | null> {
  if (!response.headers.get("content-type")?.includes("text/html")) return null;

  const html = await response.clone().text();
  if (!isUpstreamPlaceholder(html)) return null;

  return holdingPage(retryTo.toString(), builder);
}

/** The frame's holding page while the sandbox boots. Retries on its own. */
function holdingPage(retryTo: string, builder: string | null) {
  return new Response(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="2;url=${escapeHtml(retryTo)}" />
    <script>
      var notify = function () {
        try { parent.postMessage({ type: "v0-preview-loading" }, ${JSON.stringify(builder ?? "*")}); } catch (e) {}
      };
      notify();
      setInterval(notify, 250);
    </script>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        align-items: center; background: #181818; color: rgba(255,255,255,.5);
        display: flex; font: 14px system-ui, sans-serif; justify-content: center;
      }
    </style>
  </head>
  <body>Starting preview…</body>
</html>`,
    { headers: { "cache-control": "no-store", "content-type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Fallback only: keeps a shared-origin preview's navigation inside the proxy.
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
 *
 * Relative references need the other half of that. The frame's document sits at
 * `/api/v0-preview/:chatId`, whose directory is `/api/v0-preview/` — so a site
 * asking for `hero.mp4` rather than `/hero.mp4` resolved to a path with the
 * chat id missing and got nothing back. A trailing slash on the frame URL would
 * fix it, except Next 308s it straight off again, so the base href states the
 * directory explicitly. Root-relative URLs ignore its path, which is why this
 * and the rewriting above do not fight.
 */
async function keepNavigationInsidePreview(
  response: Response,
  chatId: string,
  builder: string | null,
) {
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const prefix = `/api/v0-preview/${encodeURIComponent(chatId)}`;
  const html = rewriteRootRelative(await response.text(), prefix)
    .replace(/<head(\s[^>]*)?>/i, (head) => `${head}<base href="${prefix}/">`)
    .replace("</head>", `${keepInsideScript(prefix, builder)}</head>`);

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

function keepInsideScript(prefix: string, builder: string | null) {
  return `<script>(function(){
var P=${JSON.stringify(prefix)},T=${JSON.stringify(builder ?? "*")};
function fix(u){if(typeof u!=="string")return u;if(u.indexOf(P)===0)return u;if(u.charAt(0)==="/"&&u.charAt(1)!=="/")return P+u;return u;}
function report(){try{parent.postMessage({type:"v0-preview-path",path:location.pathname+location.search+location.hash},T);}catch(e){}}
var p=history.pushState,r=history.replaceState;
history.pushState=function(s,t,u){var v=p.call(this,s,t,u==null?u:fix(String(u)));report();return v;};
history.replaceState=function(s,t,u){var v=r.call(this,s,t,u==null?u:fix(String(u)));report();return v;};
addEventListener("popstate",report);
addEventListener("hashchange",report);
addEventListener("message",function(e){if(e.source===parent&&e.data&&e.data.type==="v0-preview-go")history.go(e.data.delta|0);});
document.addEventListener("click",function(e){
var t=e.target;if(!t||!t.closest)return;var a=t.closest("a[href]");if(!a)return;
try{parent.postMessage({type:"v0-preview-navigate",href:new URL(a.getAttribute("href"),location.href).href},T);}catch(_){}
},true);
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
    <strong>${expired ? "Your session expired" : "This preview isn’t available"}</strong>
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
