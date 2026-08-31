import { z } from "zod";

import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";

import { checkCredits, consumeCredits, refundCredits, AGENT_COSTS } from "@/lib/usage";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { uploadDataUrlToStorage } from "@/lib/upload-data-url";
import { CAPACITY_MESSAGE, isCapacityError } from "@/lib/v0-error";
import { startProjectBuild } from "@/lib/v0-start-build";
import { type SiteBrief } from "@/lib/v0-site-prompt";

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
        // No media, no messages, and nothing being generated — an abandoned shell.
        return !hasMessages && sceneUrls.length === 0 && p.currentStage === "SCENE";
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
        /** A reference image attached to the prompt, as a data URL. */
        imageDataUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Everything the user asked for, in the one shape the whole pipeline reads.
      const brief: SiteBrief = { startPrompt: input.value };

      try {
        await checkCredits(AGENT_COSTS.CODE);
      } catch (error) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: error instanceof Error ? error.message : "You have run out of credits",
        });
      }

      // v0 fetches attachments itself, so a reference image has to be at a
      // public URL before anything downstream can use it. Uploaded before the
      // project exists so the brief is written complete, in one go.
      const referenceImageUrl = await uploadDataUrlToStorage(
        input.imageDataUrl,
        `frames/${ctx.auth.userId}`,
      );
      if (referenceImageUrl) brief.referenceImageUrl = referenceImageUrl;

      // The composer accepts an image with no words, and an empty string is not
      // a brief: it reaches v0 as nothing but our build rule, and it fails to
      // read back at all — leaving a project a retry could never restart.
      if (!brief.startPrompt.trim()) {
        brief.startPrompt = referenceImageUrl
          ? "Build a website that matches the attached image."
          : "Build a website.";
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
          // Always written. Everything downstream reads the build's brief back
          // out of here — the v0 call and a retry — so a project without this
          // row is a project that cannot be finished.
          prompts: [brief],
        },
      });

      // The build starts here rather than on the project page. Creating a
      // project IS asking for a site, so the redirect lands on a builder that
      // is already running instead of a form asking for the prompt again.
      await consumeCredits(AGENT_COSTS.CODE, ctx.auth.userId);

      try {
        await startProjectBuild({ projectId: createdProject.id, brief });
      } catch (error) {
        // Fail loudly on the page the user is still looking at, where their
        // prompt is still in the box, rather than handing them a half-made
        // project with nothing in it.
        await refundCredits(AGENT_COSTS.CODE, ctx.auth.userId).catch(() => {});
        await prisma.project.delete({ where: { id: createdProject.id } }).catch(() => {});

        // Always recorded in full: a capacity refusal is an incident for us,
        // and the visitor's sanitised message would otherwise be the only
        // trace that our v0 account had run out of quota.
        console.error("[build] build failed to start:", error);

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
});
