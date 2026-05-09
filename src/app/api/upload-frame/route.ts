import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, base64Image } = await req.json();

    if (!projectId || !base64Image) {
      return NextResponse.json({ error: "Missing projectId or base64Image" }, { status: 400 });
    }

    // Strip out the data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

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

    const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
    const bucket = storage.bucket(bucketName);
    
    const fileName = `projects/${projectId}/extracted-frames/frame-${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      contentType: 'image/jpeg',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
    const publicUrl = `${cdnBase}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("[upload-frame] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload extracted frame" },
      { status: 500 }
    );
  }
}
