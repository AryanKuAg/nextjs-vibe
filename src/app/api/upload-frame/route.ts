import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadMediaAsset } from "@/lib/media-storage";

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

    const { url } = await uploadMediaAsset({
      buffer,
      key: `projects/${projectId}/extracted-frames/frame-${Date.now()}.jpg`,
      contentType: "image/jpeg",
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[upload-frame] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload extracted frame" },
      { status: 500 }
    );
  }
}
