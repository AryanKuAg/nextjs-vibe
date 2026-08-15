import { fetchPreview, type ChatsGetPreviewResponse } from "v0";

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

  // This route lends out our API key, so it is gated like every other v0 route:
  // without the check, a chat id alone would be enough to read someone else's
  // unpublished site through our origin.
  const authorized = await authorizeChat(chatId);
  if (!authorized.ok) return authorized.response;

  const requestUrl = new URL(request.url);
  const fallbackUrl = new URL(
    `/api/v0-preview-loading/${encodeURIComponent(chatId)}`,
    requestUrl.origin,
  );
  fallbackUrl.searchParams.set("returnTo", requestUrl.pathname + requestUrl.search);

  return fetchPreview({
    request,
    preview: await resolvePreview(chatId),
    path,
    fallbackUrl,
    onPreviewRefresh: () => {
      previewCache.delete(chatId);
    },
  });
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
