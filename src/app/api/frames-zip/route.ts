import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Storage } from "@google-cloud/storage";

/** Parse a GCS or CDN URL into { bucketName, filePath } */
function parseGcsUrl(url: string): { bucketName: string; filePath: string } | null {
  const gcsMatch = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (gcsMatch) return { bucketName: gcsMatch[1], filePath: gcsMatch[2] };

  const cdnBase = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnBase && url.startsWith(cdnBase + "/")) {
    const bucketName = process.env.GCS_BUCKET_NAME || "sites.framerate.space";
    const filePath = url.slice(cdnBase.length + 1);
    return { bucketName, filePath };
  }

  return null;
}

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

    const parsed = parseGcsUrl(zipUrl);

    if (parsed) {
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

      const file = storage.bucket(parsed.bucketName).file(parsed.filePath);
      const [buffer] = await file.download();

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="frames-${projectId}.zip"`,
          "Content-Length": buffer.byteLength.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // Fallback: generic proxy fetch for non-GCS URLs
    const response = await fetch(zipUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch frames zip: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

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
