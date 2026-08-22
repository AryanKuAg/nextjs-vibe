import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "@/lib/db";
import { AGENT_COSTS, checkCredits, consumeCredits, refundCredits } from "@/lib/usage";
import { issuePreviewGrant } from "@/lib/preview-grant";
import { PROJECT_STAGE } from "@/lib/project-stage";
import { latestVideoUrl } from "@/lib/project-video";
import { v0 } from "@/lib/v0-client";
import { CAPACITY_MESSAGE, isCapacityError, v0Failure } from "@/lib/v0-error";
import { previewOriginForChat } from "@/lib/preview-host-check";
import { PublishError, publishSiteToR2 } from "@/lib/publish-site";
import { beginProjectBuild } from "@/lib/v0-start-build";
import { needsGeneratedVideo, siteBriefOf } from "@/lib/v0-site-prompt";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

/**
 * The seam between our project model and a v0 chat.
 *
 * Only two things need to happen on our side of the builder: opening the chat
 * that a project's site lives in, and handing the browser enough state to
 * attach to it. Every turn after that goes browser → `/api/v0/*` → v0 directly,
 * so there is nothing here that polls, reconciles or mirrors v0's transcript.
 */

/**
 * Past this, a video run has been cancelled by Inngest and cannot still land.
 * Mirrors `RUN_TIMEOUT.video` (30m) with a minute of slack, and the same figure
 * governs when the builder offers its retry.
 */
const VIDEO_RUN_LIMIT_MS = 31 * 60 * 1000;

/**
 * How long the video → v0 handoff may take before it is treated as failed.
 *
 * The clip has landed and `chats.createAsync` is in flight. That call answers
 * in seconds, so this is generous — but it has to be non-zero, because for its
 * whole duration the project has a video, no chat, and nobody polling on its
 * behalf unless this window says to keep waiting.
 */
const V0_HANDOFF_LIMIT_MS = 90 * 1000;

async function requireProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      v0ChatId: true,
      prompts: true,
      publishedUrl: true,
      currentStage: true,
      videoUrls: true,
      updatedAt: true,
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
   * Three outcomes, because a project can legitimately exist before its chat
   * does: a cinematic build makes its video first and v0 is not called until
   * that lands. So "no chat" is not automatically a failure, and the builder is
   * told which of the two it is rather than having to guess.
   */
  workspace: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const project = await requireProject(input.projectId, ctx.auth.userId);

      if (!project.v0ChatId) {
        // Whether somebody is still working on this, which is NOT the same as
        // "the stage says GENERATING_VIDEO". A cinematic build passes through
        // two waits, and the second one has its own stage: the clip lands, the
        // stage becomes VIDEO, and only then is v0 called. Treating that second
        // window as a failure showed "something went wrong when it was created"
        // over a project that was building perfectly well — and because the
        // builder stops polling once it believes that, the screen never
        // recovered even after the chat opened.
        const ageMs = Date.now() - project.updatedAt.getTime();
        const waiting =
          (project.currentStage === PROJECT_STAGE.GENERATING_VIDEO &&
            ageMs < VIDEO_RUN_LIMIT_MS) ||
          (project.currentStage === PROJECT_STAGE.VIDEO && ageMs < V0_HANDOFF_LIMIT_MS);

        return {
          status: "preparing" as const,
          // False means nobody is working on it and the user is offered a retry.
          // Each poll re-decides, so a wait that never resolves becomes a retry
          // on its own rather than spinning for the rest of the day.
          waiting,
          // Which of the two waits it is, so the builder can say so.
          stage: project.currentStage,
        };
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
        // composed — their brief plus our build rule and the video treatment —
        // and v0 needs all of it, but reading our instructions back to the
        // person who wrote one sentence is not something they asked to see.
        // The builder renders this in place of that first message.
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

      // A video agent that is still running will open the chat itself when it
      // lands, and re-dispatching would generate — and charge for — a second
      // video alongside the first. The window matches `RUN_TIMEOUT.video`:
      // past it Inngest has cancelled the run, so nothing is in flight to
      // collide with. The builder shows the same threshold as a retry button.
      const generatingFor =
        project.currentStage === PROJECT_STAGE.GENERATING_VIDEO
          ? Date.now() - project.updatedAt.getTime()
          : Infinity;

      if (generatingFor < VIDEO_RUN_LIMIT_MS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your video is still being generated. The site starts building on its own when it lands.",
        });
      }

      // The brief the user filled in, not just the sentence they typed. Retry
      // used to rebuild from the prompt alone, which quietly turned every
      // cinematic project into a plain one the moment anything went wrong.
      const brief = siteBriefOf(project.prompts) ?? {
        startPrompt: "Build a website.",
        mode: "CLASSIC" as const,
      };

      // A video that already exists is reused rather than regenerated, so this
      // only pays for footage when the first attempt never produced any.
      const existingVideo = latestVideoUrl(project.videoUrls);
      const willGenerateVideo = !existingVideo && needsGeneratedVideo(brief);
      const cost = AGENT_COSTS.CODE + (willGenerateVideo ? AGENT_COSTS.VIDEO : 0);

      await checkCredits(cost);
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      try {
        return await beginProjectBuild({
          projectId: project.id,
          userId: ctx.auth.userId,
          brief,
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
