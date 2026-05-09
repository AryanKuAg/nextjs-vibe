import { z } from "zod";

import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

import { checkCredits, consumeCredits, MODEL_COSTS, FOLLOW_UP_COST } from "@/lib/usage";
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
          prompts: input.value.trim() ? [{ startPrompt: input.value }] : [],
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

      const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
      const outputGcsUri = `gs://${bucketName}/project-${input.projectId}-${Date.now()}.mp4`;

      let imageUrl = input.imageUrl;
      let imageBase64 = input.imageBase64;

      // Inngest payload limit is ~1MB. Upload base64 image to GCS first.
      if (imageBase64) {
        const { Storage } = await import("@google-cloud/storage");
        const storage = new Storage(
          process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
            ? {
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
                credentials: {
                  client_email: process.env.GOOGLE_CLIENT_EMAIL,
                  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                },
              }
            : {
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
              }
        );

        const bucket = storage.bucket(bucketName);
        const match = imageBase64.match(/^data:(image\/[^;]+);/);
        const mimeType = match ? match[1] : "image/jpeg";
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const ext = mimeType.split("/")[1] || "jpg";
        const fileName = `frames/${input.projectId}/upload-${Date.now()}.${ext}`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
          metadata: { contentType: mimeType },
        });

        const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || `https://${bucketName}`;
        imageUrl = `${cdnUrl}/${fileName}`;

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
          outputGcsUri,
          imageUrl,
          endImageUrl: input.endImageUrl,
          imageBase64,
          model: input.model || "veo-3.1-lite-generate-001",
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
    }))
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: { id: input.projectId, userId: ctx.auth.userId },
      });

      if (!existingProject) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Follow-up prompts (conversation already has messages) cost only 10 credits.
      // First-time generation costs 100 (Pro) or 80 (Flash).
      const cost = input.isFollowUp ? FOLLOW_UP_COST : (MODEL_COSTS[input.model || ""] || 100);
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
          frameCount: input.frameCount,
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
  cancelGeneration: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Stop the Inngest run
      await inngest.send({
        name: "code-agent/cancel",
        data: { projectId: input.projectId }
      });

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
