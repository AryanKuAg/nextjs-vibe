import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "@/lib/db";
import { AGENT_COSTS, checkCredits, consumeCredits, refundCredits } from "@/lib/usage";
import { issuePreviewGrant } from "@/lib/preview-grant";
import { v0 } from "@/lib/v0-client";
import { CAPACITY_MESSAGE, isCapacityError, v0Failure } from "@/lib/v0-error";
import { startProjectBuild } from "@/lib/v0-start-build";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

/**
 * The seam between our project model and a v0 chat.
 *
 * Only two things need to happen on our side of the builder: opening the chat
 * that a project's site lives in, and handing the browser enough state to
 * attach to it. Every turn after that goes browser → `/api/v0/*` → v0 directly,
 * so there is nothing here that polls, reconciles or mirrors v0's transcript.
 */

async function requireProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true, name: true, v0ChatId: true, prompts: true },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  return project;
}

/** First entry of the `prompts` JSON column — what the user originally typed. */
function startPromptOf(prompts: unknown): string | undefined {
  if (!Array.isArray(prompts)) return undefined;

  const first = prompts[0];
  if (first && typeof first === "object" && "startPrompt" in first) {
    const value = (first as { startPrompt?: unknown }).startPrompt;
    return typeof value === "string" && value.trim() ? value : undefined;
  }
  return undefined;
}

export const v0Router = createTRPCRouter({
  /**
   * Everything the builder needs to render on load. Returns `null` only when
   * the build failed to start, which is the builder's retry case.
   */
  workspace: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const project = await requireProject(input.projectId, ctx.auth.userId);
      if (!project.v0ChatId) return null;

      const chatId = project.v0ChatId;
      const [chat, messages] = await Promise.all([
        v0.chats.get({ chatId }),
        v0.messages.list({ chatId, limit: 100 }),
      ]);

      if (chat.error !== undefined) {
        const failure = v0Failure(chat, "Could not load this build from v0.");
        console.error("[v0] workspace load failed:", failure);
        throw new TRPCError({
          code: isCapacityError(failure) ? "TOO_MANY_REQUESTS" : "INTERNAL_SERVER_ERROR",
          message: isCapacityError(failure) ? CAPACITY_MESSAGE : failure.message,
        });
      }

      return {
        chat: chat.data,
        // A transcript that fails to load is recoverable — the client refetches
        // it through SWR — so an empty list beats failing the whole view.
        messages: messages.error === undefined ? messages.data.messages : [],
        // Ownership was just proven by `requireProject`. The browser carries
        // this on its `/api/v0/*` calls so those handlers do not have to
        // re-resolve a Clerk session, which is exactly what fails there.
        accessToken: issuePreviewGrant(chatId, ctx.auth.userId),
      };
    }),

  /**
   * Retry opening the chat.
   *
   * The normal path starts the build inside `projects.create`, so this only
   * runs when that failed and the project landed with no chat — the one case
   * where the builder has nothing to show and offers a retry.
   */
  retryBuild: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const project = await requireProject(input.projectId, ctx.auth.userId);

      if (project.v0ChatId) {
        // Follow-ups belong to the chat route, which streams. Re-opening here
        // would silently start a second site for the same project.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This project already has a build. Send a message instead.",
        });
      }

      await checkCredits(AGENT_COSTS.CODE);
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      try {
        return await startProjectBuild({
          projectId: project.id,
          prompt: startPromptOf(project.prompts) ?? "Build a website.",
        });
      } catch (error) {
        // The user paid for a build that never started — hand it back.
        await refundCredits(AGENT_COSTS.CODE, ctx.auth.userId).catch(() => {});
        console.error("[v0] retry failed to start a build:", error);

        if (isCapacityError(error)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: CAPACITY_MESSAGE });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to start the build",
        });
      }
    }),
});
