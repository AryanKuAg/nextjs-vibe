import "server-only";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

/**
 * Gate for the `/api/v0/*` routes.
 *
 * These routes forward the browser straight to the v0 Platform API using our
 * API key, so a chat id is the only thing standing between a caller and
 * someone else's build. Ownership is therefore checked against the database on
 * every request rather than trusted from the URL: a chat is reachable only if
 * it is the `v0ChatId` of a project belonging to the signed-in user.
 */
export type AuthorizedChat = {
  userId: string;
  projectId: string;
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
): Promise<{ ok: true; chat: AuthorizedChat } | { ok: false; response: Response }> {
  // `auth()` throws — it does not return null — when Clerk cannot find its own
  // middleware context, which happens for requests that reached us through a
  // rewrite. A refusal is the honest answer there; letting it escape turns a
  // missing session into a 500 and, for the preview proxy, an unstyled page.
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }

  if (!userId) {
    return {
      ok: false,
      response: Response.json({ message: "Not authenticated." }, { status: 401 }),
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
