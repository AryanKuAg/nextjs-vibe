import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_CLOUD_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Support both JSON (text-only) and FormData (with optional image)
    let prompt: string;
    let target: "start" | "end" | "both";
    let projectId: string;
    let imageBytes: Buffer | null = null;
    let imageMimeType = "image/png";

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      prompt = (form.get("prompt") as string) ?? "";
      target = ((form.get("target") as string) ?? "both") as "start" | "end" | "both";
      projectId = (form.get("projectId") as string) ?? "";
      const imageFile = form.get("image") as File | null;
      if (imageFile) {
        imageMimeType = imageFile.type || "image/png";
        imageBytes = Buffer.from(await imageFile.arrayBuffer());
      }
    } else {
      const body = await req.json();
      prompt = body.prompt;
      target = body.target;
      projectId = body.projectId;
    }

    if (!prompt || !target || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const targetFrames: Array<"start" | "end"> =
      target === "both" ? ["start", "end"] : [target];

    const frameUrls: { startFrameUrl?: string; endFrameUrl?: string } = {};

    for (const frameTarget of targetFrames) {
      const framePrompt =
        frameTarget === "start"
          ? `Generate a vivid, cinematic image for the OPENING scene/first frame: ${prompt}. Make it visually stunning.`
          : `Generate a vivid, cinematic image for the CLOSING scene/last frame: ${prompt}. Make it visually stunning with a clear sense of transformation.`;

      // Build content parts — include image if provided
      const userParts: Parameters<typeof ai.models.generateContentStream>[0]["contents"][0]["parts"] = [];
      if (imageBytes) {
        userParts.push({
          inlineData: {
            data: imageBytes.toString("base64"),
            mimeType: imageMimeType,
          },
        });
      }
      userParts.push({ text: framePrompt });

      const streamingResp = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-image-preview",
        contents: [{ role: "user", parts: userParts }],
        config: {
          maxOutputTokens: 32768,
          temperature: 1,
          topP: 0.95,
          responseModalities: ["IMAGE"],
          // @ts-expect-error - thinkingConfig is supported at runtime
          thinkingConfig: { thinkingLevel: "HIGH" },
          imageConfig: {
            aspectRatio: "16:9",
            numberOfImages: 1,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
          ],
        } as Parameters<typeof ai.models.generateContentStream>[0]["config"],
      });

      // Collect the streamed image data
      let imageBase64 = "";
      let mimeType = "image/png";

      for await (const chunk of streamingResp) {
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBase64 += part.inlineData.data;
            mimeType = part.inlineData.mimeType ?? mimeType;
          }
        }
      }

      if (!imageBase64) {
        return NextResponse.json(
          { error: `Imagen returned no image data for ${frameTarget} frame` },
          { status: 500 }
        );
      }

      // Convert base64 to Buffer and upload to Google Cloud Storage
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const bucketName = process.env.GCS_BUCKET_NAME || 'spatial_io';
      const storage = new Storage({ 
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }
      });
      const bucket = storage.bucket(bucketName);
      
      const fileName = `frames/${projectId}/${frameTarget}-frame-${Date.now()}.png`;
      const file = bucket.file(fileName);
      
      await file.save(imageBuffer, {
        metadata: { contentType: mimeType },
      });

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      frameUrls[frameTarget === "start" ? "startFrameUrl" : "endFrameUrl"] = publicUrl;
    }

    // Persist to DB
    await prisma.project.update({
      where: { id: projectId },
      data: frameUrls,
    });

    return NextResponse.json(frameUrls);
  } catch (err: any) {
    console.error("[generate-frames] Error:", err);
    return NextResponse.json(
      { error: err?.message || err?.toString() || JSON.stringify(err) || "Unknown error" },
      { status: 500 }
    );
  }
}
