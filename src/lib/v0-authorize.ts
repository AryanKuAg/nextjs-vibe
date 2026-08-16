import "server-only";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";
import { previewGrantCookieName, readPreviewGrant } from "@/lib/preview-grant";

/**
 * Gate for the `/api/v0/*` routes.
 *
 * These routes forward the browser straight to the v0 Platform API using our
 * API key, so a chat id is the only thing standing between a caller and someone
 * else's build.
 *
 * There are two ways to prove you may pass, and the order matters. A signed
 * pass minted by `v0.workspace` is checked first: that procedure already
 * verified in the database that this user owns this chat, and it runs where
 * Clerk works reliably. Falling back to a live Clerk session covers anything
 * that arrives without one — but it is the fallback, not the primary, because
 * `auth()` was observed returning nothing in these handlers while succeeding in
 * tRPC on the very same request.
 */
export type AuthorizedChat = {
  userId: string;
  projectId: string | null;
};

/**
 * Loading one preview page fires a request per asset, and each one lands here.
 * Without this the proxy would issue fifty near-identical ownership queries to
 * render a single page. Only grants are cached, and only briefly: a revoked
 * project stops resolving within a minute, and a denial is never remembered so
 * a project that has only just been linked is not locked out.
 */
const GRANT_TTL_MS = 60_000;
const grants = new Map<string, { projectId: string; expiresAt: number }>();

export async function authorizeChat(
  chatId: string,
  /** Supply it to accept a signed pass from `?t=` or the grant cookie. */
  request?: Request,
): Promise<{ ok: true; chat: AuthorizedChat } | { ok: false; response: Response }> {
  if (request) {
    const url = new URL(request.url);
    const fromToken =
      readPreviewGrant(url.searchParams.get("t") ?? undefined, chatId) ??
      readPreviewGrant(
        readCookie(request.headers.get("cookie"), previewGrantCookieName(chatId)),
        chatId,
      );

    if (fromToken) return { ok: true, chat: { userId: fromToken, projectId: null } };
  }

  let userId: string | null = null;
  let failure = "no session on the request";
  try {
    ({ userId } = await auth());
  } catch (error) {
    failure = `auth() threw: ${error instanceof Error ? error.message.split("\n")[0] : error}`;
  }

  if (!userId) {
    console.error(`[v0] authorizeChat refused ${chatId} — ${failure}`);
    return {
      ok: false,
      response: Response.json(
        {
          message: "Not authenticated.",
          ...(process.env.NODE_ENV === "production" ? {} : { reason: failure }),
        },
        { status: 401 },
      ),
    };
  }

  const cacheKey = `${userId}:${chatId}`;
  const cached = grants.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, chat: { userId, projectId: cached.projectId } };
  }

  const project = await prisma.project.findFirst({
    where: { userId, v0ChatId: chatId },
    select: { id: true },
  });

  if (!project) {
    // Deliberately 404 rather than 403: a caller who does not own the chat
    // learns nothing about whether it exists.
    return {
      ok: false,
      response: Response.json({ message: "Chat not found." }, { status: 404 }),
    };
  }

  grants.set(cacheKey, { projectId: project.id, expiresAt: Date.now() + GRANT_TTL_MS });

  return { ok: true, chat: { userId, projectId: project.id } };
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
