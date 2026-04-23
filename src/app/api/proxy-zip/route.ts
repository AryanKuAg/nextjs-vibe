import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Storage } from "@google-cloud/storage";

/** Parse a GCS or CDN URL into { bucketName, filePath } */
function parseGcsUrl(url: string): { bucketName: string; filePath: string } | null {
  // Direct GCS: https://storage.googleapis.com/{bucket}/{path}
  const gcsMatch = url.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (gcsMatch) return { bucketName: gcsMatch[1], filePath: gcsMatch[2] };

  // CDN / storage.googleapis.com CNAME: https://{bucket}/{path}
  // bucket name is embedded in the hostname
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
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const parsed = parseGcsUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    });

    const file = storage.bucket(parsed.bucketName).file(parsed.filePath);
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
