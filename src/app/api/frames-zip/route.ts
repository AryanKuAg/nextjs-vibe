import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { fetchAssetByUrl } from "@/lib/media-storage";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectVideos = (project as any)?.videoUrls as string[] || [];
    const zipUrl = projectVideos[projectVideos.length - 1];

    if (!zipUrl) {
      return NextResponse.json(
        { error: "Project not found or frames not yet generated" },
        { status: 404 }
      );
    }

    // Reads through R2 for our own assets; falls back to a plain fetch for
    // legacy URLs on projects created before the R2 migration.
    const buffer = await fetchAssetByUrl(zipUrl);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="frames-${projectId}.zip"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[frames-zip] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
