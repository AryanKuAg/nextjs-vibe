import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Storage } from "@google-cloud/storage";

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

    if (!project?.videoUrl) {
      return NextResponse.json(
        { error: "Project not found or frames not yet generated" },
        { status: 404 }
      );
    }

    // The videoUrl points to the GCS frames ZIP
    // Proxy it through Next.js to bypass browser CORS restrictions
    const zipUrl = project.videoUrl;

    // If it's a GCS URL, stream directly via GCS SDK (avoids CORS)
    if (zipUrl.includes("storage.googleapis.com")) {
      const storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
      });

      // Parse bucket and file path from URL
      // e.g. https://storage.googleapis.com/spatial_io/frames/xxx/frames.zip
      const urlPath = zipUrl.replace("https://storage.googleapis.com/", "");
      const slashIdx = urlPath.indexOf("/");
      const bucketName = urlPath.slice(0, slashIdx);
      const filePath = urlPath.slice(slashIdx + 1);

      const file = storage.bucket(bucketName).file(filePath);
      const [buffer] = await file.download();

      return new NextResponse(buffer, {
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

    return new NextResponse(buffer, {
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
