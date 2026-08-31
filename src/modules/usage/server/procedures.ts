import { getUsageStatus } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const result = await getUsageStatus();

      return result;
    } catch {
      return null;
    }
  }),
  portalUrl: protectedProcedure.mutation(async () => {
    const { getPortalSession } = await import("@/lib/usage");
    const result = await getPortalSession();
    return result;
  }),
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const { prisma } = await import("@/lib/db");
    const { r2KeyFromUrl, deleteMediaAssets, deleteMediaPrefix } = await import("@/lib/media-storage");
    const userId = ctx.auth.userId;

    // 1. Fetch all projects to collect stored asset paths
    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        sceneImageUrls: true,
        videoUrls: true,
      },
    });

    // 2. Delete R2 assets (scene images, videos, deployed sites)
    try {
      for (const project of projects) {
        // Explicit keys taken from the stored public URLs. Assets from before the
        // R2 migration are not our objects, so r2KeyFromUrl returns null and they
        // are skipped rather than deleted from the wrong bucket.
        const sceneUrls = Array.isArray(project.sceneImageUrls)
          ? (project.sceneImageUrls as string[])
          : [];
        const videoUrls = Array.isArray(project.videoUrls)
          ? (project.videoUrls as string[])
          : [];

        const keys = [...sceneUrls, ...videoUrls]
          .filter((u): u is string => typeof u === "string")
          .map(r2KeyFromUrl)
          .filter((k): k is string => Boolean(k));

        await deleteMediaAssets(keys);

        // Whole folders: the deployed site, the project's frames, and any videos
        // that were never recorded on the project row.
        await deleteMediaPrefix(`sites/${project.id}/`);
        await deleteMediaPrefix(`frames/${project.id}/`);
        await deleteMediaPrefix(`projects/${project.id}/`);
        await deleteMediaPrefix(`videos/project-${project.id}-`);
      }
    } catch {
      // Storage cleanup is best-effort — don't block account deletion if it fails
      console.error("R2 cleanup failed during account deletion, continuing...");
    }

    // 3. Delete all projects (cascades to messages and fragments via Prisma)
    await prisma.project.deleteMany({
      where: { userId },
    });

    // 4. Delete usage record
    await prisma.usage.deleteMany({
      where: { key: userId },
    });

    return { success: true };
  }),
});
