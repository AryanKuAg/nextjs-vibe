import { inngest } from "./client";
import { prisma } from "@/lib/db";
import Replicate from "replicate";
import { uploadMediaAsset } from "@/lib/media-storage";
import { consumeCredits, AGENT_COSTS } from "@/lib/usage";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildImageRefinerInput, getImageSystemPrompt, stripMachineWords } from "@/lib/media-prompts";
import { shouldMockMedia, MOCK_IMAGE_URL } from "@/lib/dev-media";
import { RUN_TIMEOUT } from "./types";

// 1. Frame Generation Agent
export const generateFramesFunction = inngest.createFunction(
  { id: "generate-frames-agent", timeouts: { finish: RUN_TIMEOUT.frames } },
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
    const {
      projectId,
      prompt,
      userId,
      isDirectPrompt,
      experiencePref,
      // What the site is about, and what the background currently shows. Without
      // these a follow-up like "make it warmer" reaches the refiner as its entire
      // context and produces something unrelated to the site.
      sitePrompt,
      previousImagePrompt,
      // An image the user attached and asked us to match. Steers both the prompt
      // refiner and the image model itself.
      referenceImageUrl,
    } = event.data;

    await step.run("update-stage", async () => {
      // While the image is being generated the stage must read GENERATING_SCENE —
      // setting "SCENE" here would make the UI shimmer show the wrong label
      // (or fall back to a stale "Generating video") during image generation.
      await prisma.project.update({ where: { id: projectId }, data: { currentStage: "GENERATING_SCENE" } });
    });

    // The money boundary — see the matching guard in veoGenerateFunction. The
    // caller short-circuits before invoking this at all; the check is repeated
    // here so no future call site can bill a developer machine by accident.
    if (shouldMockMedia()) {
      console.log("[Frame Generation] MOCK_MEDIA is on — returning the demo image instead of generating.");
      await step.sleep("mock-image-delay", "4s");
      return { frameUrl: MOCK_IMAGE_URL, refinedPrompt: prompt };
    }

    // Charged per image-agent run — a regenerate is a new run the user asked for.
    const cost = AGENT_COSTS.IMAGE;

    const refinedPrompt = isDirectPrompt ? prompt : await step.run("refine-prompt", async () => {
      const routerModel = new ChatOpenAI({
        modelName: "google/gemini-3.1-flash-lite",
        apiKey: process.env.OPENROUTER_API_KEY!,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1",
        },
      });

      // The image is frame one of the background video, so it is composed for the
      // move that follows: HERO_ONLY loops in place (calm plate + ambient motion),
      // FULL_PAGE is flown through (depth layers, an opening, deep focus).
      const sysMsg = new SystemMessage(getImageSystemPrompt(experiencePref));

      // `prompt` is this turn's ask; `sitePrompt` is what the site is about. On a
      // first build they are the same string and this collapses to the old
      // behaviour. On a follow-up they differ, and that difference is the whole
      // point — see buildImageRefinerInput.
      const refinerInput = buildImageRefinerInput(
        sitePrompt || prompt,
        prompt,
        previousImagePrompt
      );
      console.log(`[Frame Agent] Refining with${previousImagePrompt ? "" : "out"} a previous scene; site context ${sitePrompt ? "present" : "missing"}.`);

      // With a reference attached the refiner must SEE it, not guess from words.
      // It describes what is actually in the picture — subject, palette, light,
      // lens, composition — so the image model reproduces the look rather than
      // inventing a scene from the prompt alone.
      const humanMessage = referenceImageUrl
        ? new HumanMessage({
          content: [
            {
              type: "text",
              text:
                `${refinerInput}\n\n` +
                `REFERENCE IMAGE ATTACHED: the user wants the new background to look like the image below. ` +
                `Study it and carry its subject matter, colour palette, lighting, time of day, lens character and ` +
                `compositional structure into your prompt, described in words. Do NOT copy any text, logo, UI or ` +
                `watermark from it. The user's request above still governs the content — the reference governs the look.`,
            },
            { type: "image_url", image_url: { url: referenceImageUrl } },
          ],
        })
        : new HumanMessage(refinerInput);

      const response = await routerModel.invoke([sysMsg, humanMessage]);
      // A named machine gets drawn — strip it before the image model ever sees it.
      return stripMachineWords((response.content as string).trim());
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

      // nano-banana is multimodal: handing it the reference alongside the prompt
      // holds the look far more faithfully than a written description alone.
      if (referenceImageUrl) {
        input.image_input = [referenceImageUrl];
        console.log("[Frame Agent] Generating with a user-supplied reference image.");
      }

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

      // Stored in R2, same bucket the built sites deploy to.
      const { url } = await uploadMediaAsset({
        buffer: imageBuffer,
        key: `frames/${projectId}/frame-${Date.now()}.png`,
        contentType: "image/png",
      });
      return url;
    });

    await step.run("save-frame", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (prisma.project as any).findUnique({ where: { id: projectId }, select: { sceneImageUrls: true } });
      const existingUrls = Array.isArray(existing?.sceneImageUrls) ? existing.sceneImageUrls : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.project as any).update({
        where: { id: projectId },
        data: {
          // `prompt` is what lets a later follow-up ("make it warmer") know what
          // it is modifying — graph state does not survive between runs. Extra
          // key on an existing Json array, so older rows stay readable.
          sceneImageUrls: [
            ...existingUrls,
            { url: frameUrl, type: "START", blockIndex: 0, prompt: refinedPrompt },
          ],
          status: "active",
        },
      });
    });

    await step.run("charge-credits", async () => {
      await consumeCredits(cost, userId);
    });

    // refinedPrompt is returned so the video agent can describe motion through
    // this exact scene instead of guessing from the raw website request.
    return { frameUrl, refinedPrompt };
  }
);


