import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/cron/cleanup-drafts
 *
 * Deletes draft projects that are older than 30 minutes and have
 * no messages beyond the initial creation prompt.
 *
 * Secure this with a CRON_SECRET environment variable.
 * Hit this endpoint from any external cron service (e.g. cron-job.org, EasyCron, Vercel Cron).
 */
export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── TTL ───────────────────────────────────────────────────────────────────
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

  // ── Delete ────────────────────────────────────────────────────────────────
  // We target projects that are:
  //   1. status = "draft"  (never had a scene generated)
  //   2. createdAt < 30 min ago
  //   3. have ≤ 1 message (only the initial USER prompt; no ASSISTANT response)
  //      — counted via a subquery using _count
  //
  // Prisma doesn't support deleteMany with _count directly, so we fetch IDs first.
  try {
    const staleProjects = await prisma.project.findMany({
      where: {
        status: "draft",
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        _count: { select: { messages: true } },
      },
    });

    // Keep projects that somehow got more than one message despite being "draft"
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
      message: `Cleaned up ${result.count} stale draft project(s) older than 30 minutes.`,
    });
  } catch (err) {
    console.error("[cleanup-drafts] Error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
