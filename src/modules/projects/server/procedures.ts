import { z } from "zod";

import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

import { checkCredits, consumeCredits, refundCredits, MODEL_COSTS, AGENT_COSTS } from "@/lib/usage";
import { uploadMediaAsset } from "@/lib/media-storage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { getTemplate } from "@/lib/templates/registry";
import { uploadDataUrlToStorage } from "@/lib/upload-data-url";
import { CAPACITY_MESSAGE, isCapacityError } from "@/lib/v0-error";
import { beginProjectBuild } from "@/lib/v0-start-build";
import { needsGeneratedVideo, normalizeBrief, type SiteBrief } from "@/lib/v0-site-prompt";

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
        /** A reference image attached to the prompt, as a data URL. */
        imageDataUrl: z.string().optional(),
        /** Which of the two build treatments the user picked. */
        mode: z.enum(["CLASSIC", "CINEMATIC"]).default("CLASSIC"),
        /** Cinematic only: how the video behaves and where it comes from. */
        motion: z.enum(["SCROLL", "LOOP"]).optional(),
        videoSource: z.enum(["AUTO", "PROMPT", "URL"]).optional(),
        videoPrompt: z.string().max(2000).optional(),
        videoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const template = input.templateId ? getTemplate(input.templateId) : null;
      if (input.templateId && !template) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown template "${input.templateId}".`,
        });
      }

      // Everything the user chose, in the one shape the whole pipeline reads.
      // Normalised, because the composer can hand us a pasted URL sitting in
      // the prompt field — see normalizeBrief.
      const brief: SiteBrief = normalizeBrief({
        startPrompt: input.value,
        mode: input.mode,
        ...(input.motion ? { motion: input.motion } : {}),
        ...(input.videoSource ? { videoSource: input.videoSource } : {}),
        ...(input.videoPrompt ? { videoPrompt: input.videoPrompt } : {}),
        ...(input.videoUrl ? { videoUrl: input.videoUrl } : {}),
      });

      // A cinematic build with no URL pays for footage as well as the site, and
      // the video agent charges its own half when it runs. Checking the total
      // up front is what stops a build being sold that cannot finish — the site
      // would open, the video would fail on credits, and the money for the site
      // would already be gone.
      const willGenerateVideo = !template && needsGeneratedVideo(brief);
      const cost = AGENT_COSTS.CODE + (willGenerateVideo ? AGENT_COSTS.VIDEO : 0);

      try {
        await checkCredits(cost);
      } catch (error) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: error instanceof Error ? error.message : "You have run out of credits",
        });
      }

      // v0 fetches attachments itself, so a reference image has to be at a
      // public URL before anything downstream can use it. Uploaded before the
      // project exists so the brief is written complete, in one go: the video
      // agent reads it back from the column much later.
      const referenceImageUrl = await uploadDataUrlToStorage(
        input.imageDataUrl,
        `frames/${ctx.auth.userId}`,
      );
      if (referenceImageUrl) brief.referenceImageUrl = referenceImageUrl;

      // The composer accepts an image with no words, and an empty string is not
      // a brief: it reaches v0 as nothing but our build rule, and it fails to
      // read back at all — which would strand a cinematic build, because the
      // video agent finds no brief to start the site from once its clip lands.
      if (!brief.startPrompt.trim()) {
        brief.startPrompt = referenceImageUrl
          ? "Build a website that matches the attached image."
          : "Build a website.";
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
          // Always written. Everything downstream reads the build's choices back
          // out of here — the video agent, the v0 call, a retry — so a project
          // without this row is a project that cannot be finished.
          prompts: [brief],
        },
      });

      // The build starts here rather than on the project page. Creating a
      // project IS asking for a site, so the redirect lands on a builder that
      // is already running instead of a form asking for the prompt again.
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      try {
        await beginProjectBuild({
          projectId: createdProject.id,
          userId: ctx.auth.userId,
          brief,
        });
      } catch (error) {
        // Fail loudly on the page the user is still looking at, where their
        // prompt is still in the box, rather than handing them a half-made
        // project with nothing in it.
        await refundCredits(AGENT_COSTS.CODE, ctx.auth.userId).catch(() => {});
        await prisma.project.delete({ where: { id: createdProject.id } }).catch(() => {});

        // Always recorded in full: a capacity refusal is an incident for us,
        // and the visitor's sanitised message would otherwise be the only
        // trace that our v0 account had run out of quota.
        console.error("[v0] build failed to start:", error);

        // Our vendor quota is not something the visitor can act on, and telling
        // them to "upgrade your plan" would point at the wrong plan entirely.
        if (isCapacityError(error)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: CAPACITY_MESSAGE });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to start the build",
        });
      }

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
