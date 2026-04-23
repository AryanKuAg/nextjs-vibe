import { z } from "zod";

import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

import { checkCredits, consumeCredits, MODEL_COSTS } from "@/lib/usage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";

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
          updatedAt: "desc",
        },
      });

      return projects;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z.string().max(10000, { message: "Value is too long" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
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

      const count = await prisma.project.count({
        where: { userId: ctx.auth.userId },
      });
      const name = `Project ${count + 1}`;

      const createdProject = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name,
          status: "draft",
          currentStage: "SCENE",
          // Only create the initial message if the user provided a prompt
          ...(input.value.trim()
            ? {
                messages: {
                  create: {
                    content: input.value,
                    role: "USER",
                    type: "RESULT",
                    stage: "SCENE",
                  },
                },
              }
            : {}),
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
  startVideoGeneration: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        prompt: z.string(),
        imageUrl: z.string().optional(),
        imageBase64: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cost = MODEL_COSTS[input.model || ""] || 25;
      await checkCredits(cost);

      const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
      const outputGcsUri = `gs://${bucketName}/project-${input.projectId}-${Date.now()}.mp4`;

      await prisma.project.update({
        where: { id: input.projectId },
        data: { currentStage: "GENERATING_VIDEO" },
      });

      await inngest.send({
        name: "veo/generate",
        data: {
          projectId: input.projectId,
          prompt: input.prompt,
          outputGcsUri,
          imageUrl: input.imageUrl,
          imageBase64: input.imageBase64,
          model: input.model || "veo-3.1-lite-generate-001",
          userId: ctx.auth.userId,
        },
      });

      return { success: true };
    }),
  buildSite: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      value: z.string(),
      videoUrl: z.string().optional().nullable(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Flat pricing as requested: 100 for Pro, 80 for Flash.
      const cost = MODEL_COSTS[input.model || ""] || 100;
      await checkCredits(cost);

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
          stage: "SITE",
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: input.projectId,
          videoUrl: input.videoUrl ?? undefined,
          model: input.model,
          userId: ctx.auth.userId,
        },
      });

      await prisma.project.update({
        where: { id: input.projectId },
        data: { 
          currentStage: "SITE",
        },
      });

      return createdMessage;
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
