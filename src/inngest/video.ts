import { prisma } from "@/lib/db";
import { shouldMockMedia, MOCK_VIDEO_URL } from "@/lib/dev-media";
import { getVideoPromptSuffix } from "@/lib/media-prompts";
import { VIDEO_DURATION_SECONDS } from "@/lib/pricing";
import { withReplicateRateLimitRetry } from "@/lib/replicate-retry";
import { consumeCredits, refundCredits, AGENT_COSTS } from "@/lib/usage";

import { inngest } from "./client";
import { RUN_TIMEOUT } from "./types";

/**
 * The video agent.
 *
 * This is the surviving half of the old `functions.ts`: the other half was the
 * E2B code agent, which v0 replaced. Video generation is untouched by that move
 * — its output is exactly what gets handed to v0 as the site's background.
 */
export const veoGenerateFunction = inngest.createFunction(
  { id: "veo-generate", retries: 0, timeouts: { finish: RUN_TIMEOUT.video } },
  {
    event: "veo/generate",
    cancelOn: [
      {
        event: "autonomous-agent/cancel",
        match: "data.projectId",
      }
    ]
  },
  async ({ event, step }) => {
    const { projectId, prompt, model, userId, refinePrompt, imagePrompt, experiencePref } = event.data;
    // Charged per video-agent run — a regenerate is a new run the user asked for.
    const cost = AGENT_COSTS.VIDEO;

    try {
      await step.run("update-project-stage-generating", async () => {
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "GENERATING_VIDEO" }
        });
      });

      // The money boundary. Every caller is expected to short-circuit before
      // invoking this function at all, but the guard lives here too so no future
      // call site can bill a developer machine by accident. Placed above the
      // prompt refinement so a local run makes no paid call of any kind.
      //
      // It short-circuits the generation, NOT the run: the mock URL is stored
      // and handed on exactly like a real one, so the rest of the pipeline —
      // and the site build waiting at the end of it — is what actually gets
      // exercised locally. Returning here instead left a cinematic project
      // parked at "creating your video" forever on every dev machine.
      const isMocked = shouldMockMedia();
      if (isMocked) {
        console.log("[Video Pipeline] MOCK_MEDIA is on — returning the demo video instead of generating.");
        await step.sleep("mock-video-delay", "4s");
      }

      // Opt-in only: refine when the agent invented the prompt ("Let AI Create" /
      // "Build it for me"). A prompt the user typed themselves is never rewritten.
      // Without this the raw website request reaches the video model with no camera
      // direction, and it fills the gap with cuts and cross-fades.
      //
      // Their words still get the house constraints appended when the clip is
      // going behind a page. That is not a rewrite of their idea — "one
      // continuous take, no cuts, locked-off camera" is what makes footage
      // usable as a background at all, and a hero loop without it visibly jumps
      // every time it repeats. A standalone regenerate is left alone.
      const videoPrompt: string = isMocked || !refinePrompt
        ? (event.data.buildSiteAfter ? `${prompt}. ${getVideoPromptSuffix(experiencePref)}` : prompt)
        : await step.run("refine-video-prompt", async () => {
          try {
            const { ChatOpenAI } = await import("@langchain/openai");
            const { HumanMessage, SystemMessage } = await import("@langchain/core/messages");
            const { getVideoSystemPrompt, getVideoPromptSuffix, buildVideoRefinerInput, stripMachineWords } =
              await import("@/lib/media-prompts");

            const routerModel = new ChatOpenAI({
              modelName: "google/gemini-3.5-flash-lite",
              apiKey: process.env.OPENROUTER_API_KEY!,
              configuration: { baseURL: "https://openrouter.ai/api/v1" },
            });

            const suffix = getVideoPromptSuffix(experiencePref);
            const response = await routerModel.invoke([
              new SystemMessage(getVideoSystemPrompt(experiencePref)),
              new HumanMessage(buildVideoRefinerInput(prompt, imagePrompt, experiencePref)),
            ]);

            // Strip machine words even from the model's own output — naming a
            // drone is what makes the video model render one in frame.
            const refined = stripMachineWords((response.content as string).trim());
            if (!refined) return `${stripMachineWords(prompt)}. ${suffix}`;
            return `${refined} ${suffix}`;
          } catch (err) {
            // Never fail the render over prompt polish — fall back to the raw
            // prompt plus the hard no-transition constraints.
            console.error("[Video] Prompt refinement failed, using fallback:", err);
            const { getVideoPromptSuffix, stripMachineWords } = await import("@/lib/media-prompts");
            return `${stripMachineWords(prompt)}. ${getVideoPromptSuffix(experiencePref)}`;
          }
        });

      const videoUri = isMocked ? MOCK_VIDEO_URL : await step.run("generate-video", async () => {
        let base64VideoData: string | null = null;
        let finalVideoUrl: string | null = null;

        if (model === "bytedance/seedance-1.5-pro") {
          const Replicate = (await import("replicate")).default;
          const replicate = new Replicate({
            auth: process.env.REPLICATE_API_KEY!,
          });

          const targetModel: `${string}/${string}` = "bytedance/seedance-1.5-pro";

          const input: Record<string, unknown> = { prompt: videoPrompt };

          if (targetModel === "prunaai/p-video") {
            input.fps = 24;
            input.draft = model === "replicate-prunaai/p-video-draft";
            input.no_op = false;
            input.duration = 4;
            input.resolution = "720p";
            input.save_audio = false;
            input.aspect_ratio = "16:9";
            input.prompt_upsampling = false;
            input.disable_safety_filter = true;

            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.last_frame_image = event.data.endImageUrl;
            }
          } else if (targetModel === "bytedance/seedance-1.5-pro") {
            input.fps = 24;
            // Seedance accepts 4-12s and bills per second — see the note on
            // VIDEO_DURATION_SECONDS, which AGENT_COSTS.VIDEO is priced against.
            input.duration = VIDEO_DURATION_SECONDS;
            input.resolution = "720p";
            input.aspect_ratio = "16:9";
            // Hero backgrounds loop, so the camera is pinned at the model level —
            // any sustained translation makes the last frame mismatch the first
            // and the loop point reads as a jump cut.
            input.camera_fixed = experiencePref === "HERO_ONLY";
            input.generate_audio = false; // Usually it's better to default to false unless explicitly needed
            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.last_frame_image = event.data.endImageUrl;
            }
          } else if (targetModel === "kwaivgi/kling-v2.5-turbo-pro") {
            input.duration = 5;
            input.aspect_ratio = "16:9";
            if (event.data.imageUrl) {
              input.start_image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.end_image = event.data.endImageUrl;
            }
          } else {
            // Generic fallback for other models
            if (event.data.imageUrl) {
              input.image = event.data.imageUrl;
              input.start_image = event.data.imageUrl;
            }
            if (event.data.endImageUrl) {
              input.end_image = event.data.endImageUrl;
            }
          }

          console.log(`[Video Pipeline] Starting Replicate model: ${targetModel}`);

          // Use predictions.create + poll to avoid non-serializable FileRef objects
          // replicate.run() may return FileRef objects that crash Inngest's JSON step serialization
          //
          // This function runs with retries: 0, so a transient 429 would otherwise
          // kill the whole generation. The retry is inline (rather than an Inngest
          // step retry) because re-running the step would create a second, billable
          // prediction — here we only re-attempt calls that never got created.
          const prediction = await withReplicateRateLimitRetry(
            "predictions.create",
            () => replicate.predictions.create({ model: targetModel, input })
          );

          console.log(`[Video Pipeline] Prediction created: ${prediction.id}, polling...`);

          // Poll until completed or failed
          let completedPrediction = prediction;
          // Sized for the 8s clip: generation scales with duration, and this
          // function runs with retries: 0, so a timeout throws away a Replicate
          // prediction that was already billed. Kept well inside the function's
          // own 30m finish timeout so the failure handler still gets to run.
          const maxWaitMs = 12 * 60 * 1000;
          const startTime = Date.now();
          while (
            completedPrediction.status !== "succeeded" &&
            completedPrediction.status !== "failed" &&
            completedPrediction.status !== "canceled"
          ) {
            if (Date.now() - startTime > maxWaitMs) {
              throw new Error(`Replicate prediction ${prediction.id} timed out after 5 minutes`);
            }
            await new Promise((r) => setTimeout(r, 5000));
            // Polling counts against the same rate limit, so a throttled poll must
            // not discard a prediction that is already running (and already paid for).
            completedPrediction = await withReplicateRateLimitRetry(
              `predictions.get(${prediction.id})`,
              () => replicate.predictions.get(prediction.id)
            );
            console.log(`[Video Pipeline] Prediction status: ${completedPrediction.status}`);
          }

          if (completedPrediction.status !== "succeeded") {
            throw new Error(`Replicate prediction failed: ${JSON.stringify(completedPrediction.error)}`);
          }

          // Extract URL as a plain string — no FileRef objects allowed here
          const rawOutput = completedPrediction.output;
          const outputItem = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

          if (outputItem && typeof outputItem === "object" && typeof (outputItem as { url?: () => string }).url === "function") {
            finalVideoUrl = (outputItem as { url: () => string }).url().toString();
          } else if (typeof outputItem === "string") {
            finalVideoUrl = outputItem;
          } else if (outputItem && typeof outputItem === "object" && "url" in outputItem) {
            // Handle plain URL objects from newer Replicate SDK versions
            finalVideoUrl = String((outputItem as { url: string }).url);
          }

          if (!finalVideoUrl) {
            throw new Error(`Invalid Replicate output: ${JSON.stringify(rawOutput)}`);
          }

          // Fetch the video buffer to upload to R2
          const res = await fetch(finalVideoUrl);
          if (!res.ok) throw new Error(`Failed to download Replicate video: ${res.statusText}`);
          const arrayBuffer = await res.arrayBuffer();
          base64VideoData = Buffer.from(arrayBuffer).toString("base64");

        } else if (model.includes("openrouter-")) {
          let actualModel = model.replace("openrouter-", "");
          if (actualModel === "seedance-2") {
            actualModel = "bytedance/seedance-2.0";
          } else if (actualModel === "seedance-2-fast") {
            actualModel = "bytedance/seedance-2.0-fast";
          }
          console.log(`[Video Pipeline] Starting OpenRouter video model: ${actualModel}`);

          const frame_images = [];
          if (event.data.imageUrl) {
            frame_images.push({
              type: "image_url",
              image_url: { url: event.data.imageUrl },
              frame_type: "first_frame"
            });
          }
          if (event.data.endImageUrl) {
            frame_images.push({
              type: "image_url",
              image_url: { url: event.data.endImageUrl },
              frame_type: "last_frame"
            });
          }

          const res = await fetch("https://openrouter.ai/api/v1/videos", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: actualModel,
              prompt: videoPrompt,
              audio: false,
              generate_audio: false, // Added as fallback for different providers
              ...(frame_images.length > 0 ? { frame_images } : {})
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(`OpenRouter Error: ${JSON.stringify(data)}`);

          const pollingUrl = data.polling_url;
          if (!pollingUrl) throw new Error(`OpenRouter returned no polling URL: ${JSON.stringify(data)}`);

          console.log(`[Video Pipeline] Polling OpenRouter: ${pollingUrl}`);

          while (true) {
            const pollResponse = await fetch(pollingUrl, {
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              },
            });
            const statusData = await pollResponse.json();

            if (statusData.status === "completed") {
              const urls = statusData.unsigned_urls ?? [];
              if (urls.length === 0) {
                throw new Error("OpenRouter completed but returned no video URLs.");
              }
              finalVideoUrl = urls[0];
              break;
            }

            if (statusData.status === "failed") {
              throw new Error(`OpenRouter Generation Failed: ${statusData.error ?? "Unknown error"}`);
            }

            // Wait 5 seconds before polling again
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }

          // Fetch the video buffer to upload to R2
          const videoRes = await fetch(finalVideoUrl!, {
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
          });
          if (!videoRes.ok) throw new Error(`Failed to download OpenRouter video: ${videoRes.statusText}`);
          const arrayBuffer = await videoRes.arrayBuffer();
          base64VideoData = Buffer.from(arrayBuffer).toString("base64");
        } else if (model.includes("gcp-")) {
          console.log(`[Video Pipeline] Starting GCP Vertex model: ${model}`);
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({
            project: process.env.GOOGLE_CLOUD_PROJECT || "spatial-492511",
            location: "us-central1",
            vertexai: true,
          });


          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const source: any = { prompt };

          if (event.data.imageUrl) {
            const imgRes = await fetch(event.data.imageUrl);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              source.image = {
                imageBytes: Buffer.from(arrayBuf).toString("base64"),
                mimeType: imgRes.headers.get("content-type") || "image/png"
              };
            }
          }

          if (event.data.endImageUrl) {
            const endImgRes = await fetch(event.data.endImageUrl);
            if (endImgRes.ok) {
              const arrayBuf = await endImgRes.arrayBuffer();
              // Pass as endImage (might be passed through by SDK if supported)
              source.endImage = {
                imageBytes: Buffer.from(arrayBuf).toString("base64"),
                mimeType: endImgRes.headers.get("content-type") || "image/png"
              };
            }
          }

          let operation = await ai.models.generateVideos({
            model: "veo-3.1-lite-generate-001",
            source: source,
            config: {
              aspectRatio: "16:9",
              personGeneration: "allow_all",
              generateAudio: false,
              resolution: "720p",
            }
          });

          console.log(`[Video Pipeline] GCP operation created: ${operation.name}, polling...`);

          while (!operation.done) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            if (ai.operations && ai.operations.get) {
              operation = await ai.operations.get({ operation });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if (typeof (ai.models as any).getVideosOperation === "function") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              operation = await (ai.models as any).getVideosOperation({ operation });
            } else {
              throw new Error("Cannot poll operation, missing API method in @google/genai");
            }
          }

          const response = operation.response;
          if (!response || !response.generatedVideos || response.generatedVideos.length === 0) {
            throw new Error("No videos generated by GCP Veo.");
          }

          const videoItem = response.generatedVideos[0].video;
          if (!videoItem) throw new Error("GCP Veo did not return a valid video item.");

          if (videoItem.videoBytes) {
            base64VideoData = Buffer.from(videoItem.videoBytes, "base64").toString("base64");
          } else if (videoItem.uri) {
            const videoRes = await fetch(videoItem.uri);
            if (!videoRes.ok) throw new Error(`Failed to download GCP video: ${videoRes.statusText}`);
            const arrayBuffer = await videoRes.arrayBuffer();
            base64VideoData = Buffer.from(arrayBuffer).toString("base64");
          } else {
            throw new Error("GCP Veo did not return video bytes or uri");
          }
        } else {
          throw new Error(`Unsupported model: ${model}`);
        }

        if (!base64VideoData) throw new Error("No video data retrieved");

        console.log(`[Video Pipeline] Pushing Video to R2 natively to bypass node limits...`);
        const { uploadMediaAsset } = await import("@/lib/media-storage");

        const bufferFinal = Buffer.from(base64VideoData, 'base64');
        const { url } = await uploadMediaAsset({
          buffer: bufferFinal,
          key: `videos/project-${event.data.projectId}-final-${Date.now()}.mp4`,
          contentType: "video/mp4",
        });
        return url;
      });

      await step.run("update-project-video-url", async () => {
        const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingUrls = Array.isArray((existingProject as any)?.videoUrls) ? (existingProject as any).videoUrls as unknown[] : [];

        const newVideoEntry = { url: videoUri, blockIndex: event.data.blockIndex || 0 };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.project as any).update({
          where: { id: projectId },
          data: {
            videoUrls: [...existingUrls, newVideoEntry],
            currentStage: "VIDEO"
          }
        });
      });

      // Nothing was generated and nothing was billed by a third party, so there
      // is nothing to charge for either.
      if (!isMocked) {
        await step.run("charge-credits", async () => {
          await consumeCredits(cost, userId);
        });
      }

      // The handoff. A cinematic build asks for footage first and the site
      // second, so this is where v0 is finally called — with a real URL in the
      // prompt rather than a description of a video that does not exist yet.
      if (event.data.buildSiteAfter) {
        await step.run("start-site-build", async () => {
          const { startBuildAfterVideo } = await import("@/lib/v0-start-build");

          try {
            return { started: await startBuildAfterVideo({ projectId, videoUrl: videoUri }) };
          } catch (error) {
            // Deliberately swallowed. The video is made, uploaded and paid for;
            // throwing would run the failure handler below and reset the stage,
            // losing that. The project is left with footage and no chat, which
            // is exactly the state the builder offers a retry for — and the
            // retry reuses this video rather than generating a second one.
            console.error("[Video Pipeline] Video succeeded but v0 refused the build:", error);
            return { started: false };
          }
        });
      }

      return { videoUrl: videoUri };
    } catch (error: unknown) {
      // Global Failure Handler: Ensure UI is NEVER stuck and credits are refunded
      await step.run("handle-video-generation-failure", async () => {
        // 1. Reset project stage so user can try again
        await prisma.project.update({
          where: { id: projectId },
          data: { currentStage: "SCENE" }
        }).catch(() => { });

        // 2. When this run was the first half of a site build, the site half was
        //    already charged by whoever dispatched it — and no site exists. The
        //    video itself is only charged on success, so this is the whole of
        //    what the user paid for nothing.
        if (event.data.buildSiteAfter) {
          await refundCredits(AGENT_COSTS.CODE, userId).catch(() => { });
        }
      });

      throw error;
    }
  }
);
