import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "@/lib/db";
import { AGENT_COSTS, checkCredits, consumeCredits, refundCredits } from "@/lib/usage";
import { issuePreviewGrant } from "@/lib/preview-grant";
import { v0 } from "@/lib/v0-client";
import { CAPACITY_MESSAGE, isCapacityError, v0Failure } from "@/lib/v0-error";
import { previewOriginForChat } from "@/lib/preview-host-check";
import { PublishError, publishSiteToR2 } from "@/lib/publish-site";
import { startProjectBuild } from "@/lib/v0-start-build";
import { siteBriefOf } from "@/lib/v0-site-prompt";
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
    select: {
      id: true,
      name: true,
      v0ChatId: true,
      prompts: true,
      publishedUrl: true,
    },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  return project;
}

export const v0Router = createTRPCRouter({
  /**
   * Everything the builder needs to render on load.
   *
   * Two outcomes. The chat is opened synchronously by whoever starts the build,
   * so a project without one is a build that failed to start — the builder shows
   * that and offers a retry rather than waiting on anything.
   */
  workspace: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const project = await requireProject(input.projectId, ctx.auth.userId);

      if (!project.v0ChatId) {
        return { status: "preparing" as const };
      }

      const chatId = project.v0ChatId;
      const [chat, messages, previewOrigin] = await Promise.all([
        v0.chats.get({ chatId }),
        v0.messages.list({ chatId, limit: 100 }),
        // Null unless the wildcard DNS record actually exists, so the browser
        // is never pointed at a hostname that will fail to resolve.
        previewOriginForChat(chatId),
      ]);

      if (chat.error !== undefined) {
        const failure = v0Failure(chat, "Could not load this build from the build service.");
        console.error("[v0] workspace load failed:", failure);
        throw new TRPCError({
          code: isCapacityError(failure) ? "TOO_MANY_REQUESTS" : "INTERNAL_SERVER_ERROR",
          message: isCapacityError(failure) ? CAPACITY_MESSAGE : failure.message,
        });
      }

      return {
        status: "ready" as const,
        chat: chat.data,
        publishedUrl: project.publishedUrl,
        // What the user actually typed. The message that opened this chat is
        // composed — their brief plus our build rule — and v0 needs all of it,
        // but reading our instructions back to the person who wrote one
        // sentence is not something they asked to see. The builder renders this
        // in place of that first message.
        openingPrompt: siteBriefOf(project.prompts)?.startPrompt ?? null,
        previewOrigin,
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

      // The brief the user filled in, not just the sentence they typed.
      const brief = siteBriefOf(project.prompts) ?? { startPrompt: "Build a website." };

      await checkCredits(AGENT_COSTS.CODE);
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      try {
        return await startProjectBuild({ projectId: project.id, brief });
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

  /**
   * Build the site and put it on R2.
   *
   * Deliberately separate from the preview: a preview is v0's live sandbox,
   * this is a static export the user owns at a URL of ours. It runs the
   * customer's own build in a throwaway E2B sandbox, so it is slow (a minute or
   * two) and explicitly asked for rather than automatic.
   */
  publish: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const project = await requireProject(input.projectId, ctx.auth.userId);

      if (!project.v0ChatId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "There is nothing to publish yet.",
        });
      }

      try {
        const result = await publishSiteToR2({
          chatId: project.v0ChatId,
          projectId: project.id,
        });

        await prisma.project.update({
          where: { id: project.id },
          data: { publishedUrl: result.url, publishedAt: new Date() },
        });

        return result;
      } catch (error) {
        // The build log is the useful part of a publish failure, and it is the
        // user's own code that failed — so it goes to them, not just to us.
        console.error("[publish] failed:", error);

        if (error instanceof PublishError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.detail ? `${error.message}\n\n${error.detail}` : error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to publish the site.",
        });
      }
    }),
});
