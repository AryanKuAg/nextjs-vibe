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
      },
    });

    // 2. Delete R2 assets (scene images, deployed sites)
    try {
      for (const project of projects) {
        // Explicit keys taken from the stored public URLs. Assets from before the
        // R2 migration are not our objects, so r2KeyFromUrl returns null and they
        // are skipped rather than deleted from the wrong bucket.
        const sceneUrls = Array.isArray(project.sceneImageUrls)
          ? (project.sceneImageUrls as string[])
          : [];
        const keys = sceneUrls
          .filter((u): u is string => typeof u === "string")
          .map(r2KeyFromUrl)
          .filter((k): k is string => Boolean(k));

        await deleteMediaAssets(keys);

        // Whole folders: the deployed site and the project's frames. The
        // `videos/` prefix is swept too — the video agent is gone, but clips it
        // generated before it was removed are still sitting in the bucket.
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
