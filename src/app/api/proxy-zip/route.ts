import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Storage } from "@google-cloud/storage";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Only allow our own GCS bucket
    if (!url.startsWith("https://storage.googleapis.com/")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Use GCS SDK to stream — avoids public-access CORS issues
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });

    // Parse bucket + file path from URL
    // e.g. https://storage.googleapis.com/spatial_io/frames/xxx/frames.zip
    const urlPath = url.replace("https://storage.googleapis.com/", "");
    const slashIdx = urlPath.indexOf("/");
    const bucketName = urlPath.slice(0, slashIdx);
    const filePath = urlPath.slice(slashIdx + 1);

    const file = storage.bucket(bucketName).file(filePath);
    const [buffer] = await file.download();

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="frames.zip"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[proxy-zip] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
