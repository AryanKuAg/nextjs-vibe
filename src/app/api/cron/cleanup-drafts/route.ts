import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/cleanup-drafts
 *
 * Deletes draft projects that:
 *   1. Have status = "draft" (no scene ever generated)
 *   2. Have ≤ 1 message (only the initial prompt, no AI response yet)
 *   3. Have had NO activity for at least 30 minutes (based on updatedAt)
 *   4. Are at least 1 hour old (createdAt) — safety buffer against active sessions
 *
 * Using updatedAt (not createdAt) prevents the race condition where a user
 * who has been typing for 30+ minutes gets their in-progress draft deleted.
 * Any user interaction (sending a message, navigating to the project) bumps
 * updatedAt, keeping the project safe.
 */
export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── TTL ───────────────────────────────────────────────────────────────────
  // A project is "stale" only if it has had no activity for 30 minutes.
  const inactiveSince = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

  // Extra safety: never delete a project that is less than 1 hour old,
  // even if it looks idle — the user might just be slow to type.
  const minimumAge = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  try {
    const staleProjects = await prisma.project.findMany({
      where: {
        status: "draft",
        updatedAt: { lt: inactiveSince }, // ← activity-based, not birth-based
        createdAt: { lt: minimumAge },    // ← safety buffer: project must be ≥1h old
      },
      select: {
        id: true,
        _count: { select: { messages: true } },
      },
    });

    // Keep projects that have more than 1 message (user has been active)
    const idsToDelete = staleProjects
      .filter((p) => p._count.messages <= 1)
      .map((p) => p.id);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No stale drafts found." });
    }

    // Cascade delete via Prisma (messages + fragments deleted by onDelete: Cascade)
    const result = await prisma.project.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    console.log(`[cleanup-drafts] Deleted ${result.count} stale draft project(s).`);

    return NextResponse.json({
      deleted: result.count,
      ids: idsToDelete,
      message: `Cleaned up ${result.count} stale draft project(s) older than 1 hour with no recent activity.`,
    });
  } catch (err) {
    console.error("[cleanup-drafts] Error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
