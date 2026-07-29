import { z } from "zod";

import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

import { checkCredits, consumeCredits, MODEL_COSTS, AGENT_COSTS } from "@/lib/usage";
import { uploadMediaAsset } from "@/lib/media-storage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { getTemplate } from "@/lib/templates/registry";
import { PROJECT_STAGE } from "@/lib/project-stage";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({
      id: z.string().min(1, { message: "Id is required" }),
    }))
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
        include: {
          messages: {
            where: {
              role: "USER"
            },
            orderBy: { createdAt: "asc" },
            take: 1
          }
        }
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return existingProject;
    }),
  getMany: protectedProcedure
    .query(async ({ ctx }) => {
      const projects = await prisma.project.findMany({
        where: {
          userId: ctx.auth.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      const emptyProjectIds = projects.filter(p => {
        const hasMessages = p._count.messages > 0;
        const sceneUrls = Array.isArray(p.sceneImageUrls) ? p.sceneImageUrls : [];
        const videos = Array.isArray(p.videoUrls) ? p.videoUrls : [];
        // If it has no media, no messages, and is not currently generating anything
        return !hasMessages && sceneUrls.length === 0 && videos.length === 0 && p.currentStage === "SCENE";
      }).map(p => p.id);

      if (emptyProjectIds.length > 0) {
        // Await deletion to ensure it completes before the serverless function suspends
        await prisma.project.deleteMany({
          where: { id: { in: emptyProjectIds } }
        }).catch(err => console.error("Failed to delete empty projects:", err));
      }

      // Return only the non-empty projects to the client immediately
      return projects.filter(p => !emptyProjectIds.includes(p.id));
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z.string().max(100000, { message: "Value is too long" }),
        isAgentMode: z.boolean().default(false),
        // Set when the project is created by remixing a gallery template. An
        // unknown id is rejected rather than silently ignored — a project that
        // claims a template it cannot download would fail mid-build.
        templateId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await checkCredits(1);
        await consumeCredits(0); // Project metadata creation is free; generation is charged separately
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You have run out of credits"
          });
        }
      }

      const template = input.templateId ? getTemplate(input.templateId) : null;
      if (input.templateId && !template) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown template "${input.templateId}".`,
        });
      }

      const count = await prisma.project.count({
        where: { userId: ctx.auth.userId },
      });
      const name = template ? `${template.title} Remix` : `Project ${count + 1}`;

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name,
          status: "draft",
          currentStage: "SCENE",
          templateId: template?.id ?? null,
          prompts: input.value.trim() ? [{ startPrompt: input.value }] : [],
        },
      });

      return createdProject;
    }),
  rename: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.project.findUnique({
        where: { id: input.id, userId: ctx.auth.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return prisma.project.update({
        where: { id: input.id },
        data: { name: input.name.trim() },
      });
    }),
  updatePrompts: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      prompts: z.any(), // Array of { startPrompt, endPrompt, videoPrompt }
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return prisma.project.update({
        where: { id: input.projectId },
        data: { prompts: input.prompts },
      });
    }),
  startVideoGeneration: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        prompt: z.string(),
        imageUrl: z.string().optional(),
        endImageUrl: z.string().optional(),
        imageBase64: z.string().optional(),
        model: z.string().optional(),
        blockIndex: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cost = MODEL_COSTS[input.model || ""] || 25;
      await checkCredits(cost);

      let imageUrl = input.imageUrl;
      let imageBase64 = input.imageBase64;

      // Inngest payload limit is ~1MB. Upload base64 image to R2 first.
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/[^;]+);/);
        const mimeType = match ? match[1] : "image/jpeg";
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = mimeType.split("/")[1] || "jpg";

        const uploaded = await uploadMediaAsset({
          buffer,
          key: `frames/${input.projectId}/upload-${Date.now()}.${ext}`,
          contentType: mimeType,
        });
        imageUrl = uploaded.url;

        // Remove base64 so it doesn't get sent to Inngest
        imageBase64 = undefined;
      }

      await prisma.project.update({
        where: { id: input.projectId },
        data: { currentStage: "GENERATING_VIDEO" },
      });

      await inngest.send({
        name: "veo/generate",
        data: {
          projectId: input.projectId,
          prompt: input.prompt,
          imageUrl,
          endImageUrl: input.endImageUrl,
          imageBase64,
          model: input.model || "bytedance/seedance-1.5-pro",
          userId: ctx.auth.userId,
          blockIndex: input.blockIndex,
        },
      });

      return { success: true };
    }),
  buildSite: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      value: z.string(),
      videoUrl: z.string().optional().nullable(),
      frameCount: z.number().optional(),
      model: z.string().optional(),
      isFollowUp: z.boolean().optional(),
      imageDataUrl: z.string().optional(),
      isAgentMode: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Code generation is charged per user message, not per agent run.
      await checkCredits(AGENT_COSTS.CODE);

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
          stage: "SITE",
        },
      });

      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: input.projectId,
          videoUrl: input.videoUrl ?? undefined,
          frameCount: input.frameCount,
          model: input.model,
          userId: ctx.auth.userId,
          imageDataUrl: input.imageDataUrl,
          isAgentMode: input.isAgentMode,
          // Returned by the agent's onFailure handler if the run never completes.
          refundOnFailure: AGENT_COSTS.CODE,
        },
      });

      await prisma.project.update({
        where: { id: input.projectId },
        data: {
          // The code agent flips this to BUILDING_SITE once it starts and back to
          // SITE when it lands. Marking it THINKING here stops the previous turn's
          // stage being read as this turn's status while the sandbox boots.
          currentStage: PROJECT_STAGE.THINKING,
        },
      });

      return createdMessage;
    }),
  startAutonomousGeneration: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      prompt: z.string(),
      model: z.string().optional(),
      isAgentMode: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // A project that already produced a fragment has a live site — anything after
      // that is a follow-up edit, which skips the wizard instead of rebuilding.
      const existingFragment = await prisma.fragment.findFirst({
        where: { message: { projectId: input.projectId } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const isFollowUp = Boolean(existingFragment);

      // The original site request, so media agents regenerating a background still
      // know what the site is about even when the follow-up message is just
      // "make another video".
      const firstUserMessage = await prisma.message.findFirst({
        where: { projectId: input.projectId, role: "USER" },
        orderBy: { createdAt: "asc" },
        select: { content: true },
      });

      await checkCredits(AGENT_COSTS.CODE);

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.prompt,
          role: "USER",
          type: "RESULT",
          stage: "SITE",
        },
      });

      // Charged once per user message. The code agent may run several times for this
      // message (template pass, lenient rebuild, retries) and must not charge again.
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      await inngest.send({
        name: "autonomous-agent/run",
        data: {
          prompt: input.prompt,
          sitePrompt: firstUserMessage?.content || input.prompt,
          projectId: input.projectId,
          model: input.model,
          userId: ctx.auth.userId,
          isAgentMode: input.isAgentMode,
          isFollowUp,
          // Returned by the agent's onFailure handler if the run never completes.
          // Only the code charge — image and video bill themselves on success.
          refundOnFailure: AGENT_COSTS.CODE,
        },
      });

      await prisma.project.update({
        where: { id: input.projectId },
        data: {
          // A fresh build starts at the background step. A follow-up has no known
          // step until an agent announces one — and it must not keep reporting the
          // previous turn's stage, which is what made the status line look stuck.
          currentStage: isFollowUp ? PROJECT_STAGE.THINKING : PROJECT_STAGE.SCENE,
        },
      });

      return createdMessage;
    }),
  cancelGeneration: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Stop the Inngest run for both v1 and v2 autonomous agents
      await inngest.send([
        {
          name: "code-agent/cancel",
          data: { projectId: input.projectId }
        },
        {
          name: "autonomous-agent/cancel",
          data: { projectId: input.projectId }
        },
        {
          name: "project.user.response",
          data: { projectId: input.projectId, action: "CANCEL", payload: null }
        }
      ]);

      // Inject a cancellation message to unblock the UI
      await prisma.message.create({
        data: {
          projectId: input.projectId,
          role: "ASSISTANT",
          content: "Generation was manually stopped.",
          type: "ERROR",
          stage: "SITE"
        }
      });

      return { success: true };
    }),
  cancelVideoGeneration: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await prisma.project.update({
        where: { id: input.projectId },
        data: { currentStage: "SCENE" }
      });

      return { success: true };
    }),
});
