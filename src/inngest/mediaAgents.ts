import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { Storage } from "@google-cloud/storage";
import Replicate from "replicate";
import { consumeCredits, MODEL_COSTS } from "@/lib/usage";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// 1. Frame Generation Agent
export const generateFramesFunction = inngest.createFunction(
  { id: "generate-frames-agent", timeouts: { finish: "5m" } },
  {
    event: "frame-generation/run",
    cancelOn: [
      {
        event: "autonomous-agent/cancel",
        match: "data.projectId",
      }
    ]
  },
  async ({ event, step }) => {
    const { projectId, prompt, model, userId, isDirectPrompt } = event.data;

    await step.run("update-stage", async () => {
      // While the image is being generated the stage must read GENERATING_SCENE —
      // setting "SCENE" here would make the UI shimmer show the wrong label
      // (or fall back to a stale "Generating video") during image generation.
      await prisma.project.update({ where: { id: projectId }, data: { currentStage: "GENERATING_SCENE" } });
    });

    const cost = MODEL_COSTS[model as string] ?? 10;

    const refinedPrompt = isDirectPrompt ? prompt : await step.run("refine-prompt", async () => {
      const routerModel = new ChatOpenAI({
        modelName: "google/gemini-3.1-flash-lite",
        apiKey: process.env.OPENROUTER_API_KEY!,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      });

      const sysMsg = new SystemMessage(
        "You are an expert image prompt engineer. The user will provide a prompt for building a website. " +
        "Your job is to extract the visual elements of the request and write a highly descriptive, visually-focused prompt specifically for generating a cinematic scene or hero image. " +
        "Focus on lighting, subject, style, color palette, and atmosphere. Do NOT include text, UI elements, buttons, or website layouts in the image prompt."
      );

      const response = await routerModel.invoke([sysMsg, new HumanMessage(prompt)]);
      return response.content as string;
    });

    const frameUrl = await step.run("generate-image", async () => {
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_KEY!,
      });

      const input: Record<string, unknown> = {
        prompt: refinedPrompt,
        aspect_ratio: "16:9",
        output_format: "png",
      };

      const output = await replicate.run("google/nano-banana-2-lite", { input });
      const outputItem = Array.isArray(output) ? output[0] : output;
      let imageUrl = "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (outputItem && typeof outputItem === "object" && typeof (outputItem as any).url === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        imageUrl = (outputItem as any).url().toString();
      } else if (typeof outputItem === "string") {
        imageUrl = outputItem;
      }

      if (!imageUrl) throw new Error("Replicate returned invalid output");

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error("Failed to download image from Replicate");

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const bucketName = process.env.GCS_BUCKET_NAME || 'sites.framerate.space';
      const storage = new Storage(
        process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
          ? {
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            credentials: {
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\\n"),
            },
          }
          : { projectId: process.env.GOOGLE_CLOUD_PROJECT }
      );
      const bucket = storage.bucket(bucketName);
      const fileName = `frames/${projectId}/frame-${Date.now()}.png`;
      const file = bucket.file(fileName);

      await file.save(imageBuffer, { metadata: { contentType: "image/png" } });
      const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucketName}`;
      return `${cdnBase}/${fileName}`;
    });

    await step.run("save-frame", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma.project as any).findUnique({ where: { id: projectId }, select: { sceneImageUrls: true } });
      const existingUrls = Array.isArray(existing?.sceneImageUrls) ? existing.sceneImageUrls : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.project as any).update({
        where: { id: projectId },
        data: {
          sceneImageUrls: [...existingUrls, { url: frameUrl, type: "START", blockIndex: 0 }],
          status: "active",
        },
      });
    });

    await step.run("charge-credits", async () => {
      await consumeCredits(cost, userId);
    });

    return { frameUrl };
  }
);


