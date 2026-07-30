import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { consumeCredits } from "@/lib/usage";

/**
 * What this legacy chat route charges. Named so the charge and the
 * refund-on-failure amount can't drift apart. Note this is higher than the
 * AGENT_COSTS.CODE that projects.buildSite charges for the same code-agent run.
 */
const LEGACY_MESSAGE_COST = 10;

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
  .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required" }),
        stage: z.enum(["SCENE", "VIDEO", "SITE"]).optional().default("SITE"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          stage: input.stage,
          project: {
            userId: ctx.auth.userId,
          },
        },
        include: {
          fragment: true,
        },
        orderBy: {
          updatedAt: "asc",
        },
      });

      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z.string()
          .min(1, { message: "Value is required" })
          .max(100000, { message: "Value is too long" }),
        projectId: z.string().min(1, { message: "Project ID is required" }),
        stage: z.enum(["SCENE", "VIDEO", "SITE"]).optional().default("SITE"),
        model: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Synthetic sentinel messages (e.g. retry/error injections from the UI) skip credits and AI
      const isSyntheticMessage = input.model === "system-error";

      if (!isSyntheticMessage) {
        try {
          await consumeCredits(LEGACY_MESSAGE_COST);
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Something went wrong" });
          } else {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "You have run out of credits"
            });
          }
        }
      }

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: isSyntheticMessage ? "ASSISTANT" : "USER",
          type: "RESULT",
          stage: input.stage,
        },
      });

      // We ONLY fire the code-agent directly if we're in the old flow or triggered explicitly.
      // With the new 3-stage flow, code-agent is fired via projects.buildSite instead,
      // but if an existing project UI uses this for regular chat, we still fire it.
      if (input.stage === "SITE" && !isSyntheticMessage) {
        // videoUrls entries are stored as { url, blockIndex } objects (older rows
        // may hold plain strings). Always send a plain URL string — the code
        // agent additionally re-derives this from the project row as a fallback.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storedUrls = (existingProject as any).videoUrls;
        const urls: unknown[] = Array.isArray(storedUrls) ? storedUrls : [];
        const latest = urls[urls.length - 1];
        const latestVideoUrl =
          typeof latest === "string"
            ? latest
            : latest && typeof latest === "object" && typeof (latest as { url?: unknown }).url === "string"
              ? (latest as { url: string }).url
              : undefined;

        await inngest.send({
          name: "code-agent/run",
          data: {
            value: input.value,
            projectId: input.projectId,
            videoUrl: latestVideoUrl,
            isFollowUp: true,
            model: input.model,
            userId: ctx.auth.userId,
            // Returned by the agent's onFailure handler if the run never completes.
            refundOnFailure: LEGACY_MESSAGE_COST,
          },
        });
      }

      return createdMessage;
    }),
});
