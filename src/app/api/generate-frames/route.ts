import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { uploadMediaAsset } from "@/lib/media-storage";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { checkCredits, consumeCredits, MODEL_COSTS } from "@/lib/usage";



export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support both JSON (text-only) and FormData (with optional image)
  let prompt: string;
  let projectId: string;
  let model: string = "replicate-nb-2";
  let frameType: string = "START";
  let blockIndex: number = 0;
  let imageBytes: Buffer | null = null;
  let imageMimeType = "image/png";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    prompt = (form.get("prompt") as string) ?? "";
    projectId = (form.get("projectId") as string) ?? "";
    model = (form.get("model") as string) || model;
    frameType = (form.get("frameType") as string) || "START";
    blockIndex = parseInt((form.get("blockIndex") as string) || "0", 10);
    const imageFile = form.get("image") as File | null;
    if (imageFile) {
      imageMimeType = imageFile.type || "image/png";
      imageBytes = Buffer.from(await imageFile.arrayBuffer());
    }
  } else {
    const body = await req.json();
    prompt = body.prompt ?? "";
    projectId = body.projectId ?? "";
    model = body.model || model;
    frameType = body.frameType || "START";
    blockIndex = body.blockIndex !== undefined ? body.blockIndex : 0;
  }

  if (!prompt || !projectId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify project ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Pre-check credits
  const cost = MODEL_COSTS[model] ?? 10;
  try {
    await checkCredits(cost);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 402 });
  }

  try {
    const framePrompt = prompt;

    // Use Replicate to generate the image
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY!,
    });

    // Map the internal model ID to actual Replicate models
    let replicateModel: `${string}/${string}` = "black-forest-labs/flux-schnell"; // default fallback
    if (model === "replicate-nb-2") {
      replicateModel = "google/nano-banana-2";
    } else if (model.includes("/")) {
      replicateModel = model as `${string}/${string}`;
    }

    const input: Record<string, unknown> = {
      prompt: framePrompt,
    };

    if (model === "bytedance/seedream-4.5") {
      input.aspect_ratio = "16:9";
      input.size = "2K";
    } else if (model === "replicate-nb-2") {
      input.aspect_ratio = "16:9";
      input.output_format = "png";
      input.resolution = "1K";
    } else {
      input.go_fast = true;
      input.num_outputs = 1;
      input.aspect_ratio = "16:9";
      input.output_format = "png";
    }

    if (imageBytes) {
      const base64Image = `data:${imageMimeType};base64,${imageBytes.toString("base64")}`;
      if (model === "replicate-nb-2" || model === "bytedance/seedream-4.5") {
        input.image_input = [base64Image];
      } else {
        input.image = base64Image;
      }
    }

    const output = await replicate.run(replicateModel, { input });

    const outputItem = Array.isArray(output) ? output[0] : output;

    let imageUrl = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (outputItem && typeof outputItem === "object" && typeof (outputItem as any).url === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageUrl = (outputItem as any).url().toString();
    } else if (typeof outputItem === "string") {
      imageUrl = outputItem;
    }

    if (!imageUrl) {
      throw new Error(`Replicate returned invalid output: ${JSON.stringify(output)}`);
    }

    // Fetch the generated image from Replicate
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from Replicate: ${imageResponse.statusText}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    const { url: publicUrl } = await uploadMediaAsset({
      buffer: imageBuffer,
      key: `frames/${projectId}/frame-${Date.now()}.png`,
      contentType: mimeType,
    });

    // Persist to sceneImageUrls and promote draft → active
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma.project as any).findUnique({
        where: { id: projectId },
        select: { sceneImageUrls: true },
      });
      const existingUrls: unknown[] = Array.isArray(existing?.sceneImageUrls)
        ? (existing.sceneImageUrls as unknown[])
        : [];

      const newEntry = { url: publicUrl, type: frameType, blockIndex };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.project as any).update({
        where: { id: projectId },
        data: {
          sceneImageUrls: [...existingUrls, newEntry],
          // Promote to active on first successful scene generation
          status: "active",
        },
      });
    } catch {
      // sceneImageUrls column not yet in DB — skipping history persist until db push is run
    }

    // Consume credits only on success
    await consumeCredits(cost);

    return NextResponse.json({ frameUrl: publicUrl });
  } catch (err: unknown) {
    console.error("[generate-frames] Error:", err);

    return NextResponse.json(
      { error: (err as Error)?.message || String(err) || "Unknown error" },
      { status: 500 }
    );
  }
}
