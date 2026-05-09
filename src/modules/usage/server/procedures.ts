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
    const { Storage } = await import("@google-cloud/storage");
    const userId = ctx.auth.userId;

    // 1. Fetch all projects to collect GCS asset paths
    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        sceneImageUrls: true,
        videoUrls: true,
      },
    });

    // 2. Delete GCS assets (scene images, videos, deployed sites)
    try {
      const bucketName = process.env.GCS_BUCKET_NAME || "sites.framerate.space";
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

      for (const project of projects) {
        // Delete scene images (stored at frames/{projectId}/frame-*.png)
        const sceneUrls = Array.isArray(project.sceneImageUrls)
          ? (project.sceneImageUrls as string[])
          : [];
        for (const url of sceneUrls) {
          try {
            // Extract GCS path from public URL
            const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://sites.framerate.space`;
            const gcsPath = url
              .replace(`https://storage.googleapis.com/${bucketName}/`, "")
              .replace("https://storage.googleapis.com/spatial_io/", "")
              .replace(`${cdnBase}/`, "");
            if (gcsPath && gcsPath !== url) {
              await bucket.file(gcsPath).delete({ ignoreNotFound: true });
            }
          } catch {
            // Continue cleanup even if individual file deletion fails
          }
        }

        // Delete videos (stored at videos/project-{projectId}-*.mp4)
        const videoUrls = Array.isArray(project.videoUrls)
          ? (project.videoUrls as string[])
          : [];
        for (const url of videoUrls) {
          try {
            const cdnBase2 = process.env.NEXT_PUBLIC_CDN_URL || `https://sites.framerate.space`;
            const gcsPath = url
              .replace(`https://storage.googleapis.com/${bucketName}/`, "")
              .replace("https://storage.googleapis.com/spatial_io/", "")
              .replace(`${cdnBase2}/`, "");
            if (gcsPath && gcsPath !== url) {
              await bucket.file(gcsPath).delete({ ignoreNotFound: true });
            }
          } catch {
            // Continue cleanup even if individual file deletion fails
          }
        }

        // Delete deployed site folder (stored at sites/{projectId}/)
        try {
          const [siteFiles] = await bucket.getFiles({
            prefix: `sites/${project.id}/`,
          });
          if (siteFiles.length > 0) {
            await Promise.all(
              siteFiles.map((f) => f.delete({ ignoreNotFound: true }))
            );
          }
        } catch {
          // Continue cleanup even if site folder deletion fails
        }

        // Delete any remaining frames folder (stored at frames/{projectId}/)
        try {
          const [frameFiles] = await bucket.getFiles({
            prefix: `frames/${project.id}/`,
          });
          if (frameFiles.length > 0) {
            await Promise.all(
              frameFiles.map((f) => f.delete({ ignoreNotFound: true }))
            );
          }
        } catch {
          // Continue cleanup even if frames folder deletion fails
        }
      }
    } catch {
      // GCS cleanup is best-effort — don't block account deletion if it fails
      console.error("GCS cleanup failed during account deletion, continuing...");
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
