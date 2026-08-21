"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { processImageFile } from "@/lib/process-image-file";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import {
  VIDEO_MOTIONS,
  VIDEO_SOURCES,
  type SiteMode,
  type VideoMotion,
  type VideoSource,
} from "@/lib/v0-site-prompt";
import { ComposerChipMenu } from "./composer-chip-menu";
import { COMPOSER_MODELS, ComposerModelMenu } from "./composer-model-menu";
import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";
import { cn } from "@/lib/utils";


const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(100000, { message: "Value is too long" }),
});


/**
 * How much decoded video a scroll-scrubbed page may hold in memory.
 *
 * `scrolly-video` decodes the whole clip up front and keeps every frame as an
 * uncompressed bitmap in one array — no cap, no downscale, no eviction. The
 * cost is resolution times frame count, and it is brutal: a 4K 10s clip at
 * 30fps is 300 frames of 3840x2160x4 bytes, near enough 10GB, re-paid on every
 * reload of the preview. A pasted 4K link took a 8GB machine to 30GB of swap
 * and an out-of-memory dialog.
 *
 * Two gigabytes is roughly a 1080p clip of a few seconds, or 720p of ten — the
 * shape of the footage this product generates itself. Above that the site would
 * not be usable by whoever it is built for either, so it is refused here rather
 * than discovered by their browser.
 *
 * Only scroll-driven builds decode anything. A looping hero is a plain <video>
 * and costs nothing, whatever its resolution.
 */
const SCRUB_MEMORY_BUDGET_BYTES = 2 * 1024 ** 3;

/** Reads a video's dimensions without downloading it. Null if it cannot be read. */
function probeVideo(url: string) {
  return new Promise<{ width: number; height: number; duration: number } | null>((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    const finish = (value: { width: number; height: number; duration: number } | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    // Unreadable is not the same as too big: a host that blocks us still builds
    // fine, so anything we cannot measure is allowed through.
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 8000);
    video.src = url;
  });
}

interface ProjectFormProps {
  showModelSelector?: boolean;
  isLandingPage?: boolean;
}

export const ProjectForm = ({ showModelSelector = false, isLandingPage = false }: ProjectFormProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  // Stays true from submit through navigation so the button can't fire twice
  // (createProject.isPending briefly drops between success and the route change,
  // and the image branch defers the mutation inside a FileReader callback).
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode] = useState<SiteMode>("CLASSIC");
  const [model, setModel] = useState<string>(COMPOSER_MODELS[0].value);
  const [motion, setMotion] = useState<VideoMotion>("SCROLL");
  const [videoSource, setVideoSource] = useState<VideoSource>("AUTO");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Global drag-and-drop listeners for the fullscreen overlay
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        dragCounterRef.current++;
        setIsDragging(true);
      }
    };
    const handleDragLeave = () => {
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageFile(file);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleImageFile = (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Unsupported image format. Please use JPEG or PNG.", { duration: Infinity });
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedImage(file);
    setImagePreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  };

  const removeImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setUploadedImage(null);
    setImagePreviewUrl(null);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        setIsRedirecting(false); // failed — let the user try again
        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
          return;
        }

        // Only OUR credit system opens the upgrade modal. A build can also be
        // refused because the v0 account behind it is out of quota, which is
        // also TOO_MANY_REQUESTS but is nothing the visitor can buy their way
        // out of — offering them an upgrade there would be a lie.
        if (error.message?.toLowerCase().includes("credit")) {
          setShowCreditsModal(true);
        } else {
          toast.error(error.message, { duration: Infinity });
        }
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (createProject.isPending || isRedirecting) return; // guard against double-submit

    if (window.innerWidth < 768) {
      setShowSignInModal(true);
      return;
    }

    if (!userId) {
      setShowSignInModal(true);
      return;
    }

    // A chosen video source that carries no value would build a site with no
    // video and no explanation, so it is caught before anything is charged.
    if (mode === "CINEMATIC" && videoSource === "URL") {
      const trimmed = videoUrl.trim();
      const valid = /^https?:\/\/\S+$/i.test(trimmed);
      if (!valid) {
        toast.error("Enter a video URL starting with http:// or https://");
        return;
      }

      // Scroll-scrubbing decodes the whole clip into memory, so an oversized
      // one is refused before it can take the browser down with it.
      if (motion === "SCROLL") {
        const meta = await probeVideo(trimmed);
        if (meta && meta.width > 0 && Number.isFinite(meta.duration)) {
          // 30fps assumed: the element does not expose a frame rate, and
          // over-estimating is the safe direction.
          const frames = Math.ceil(meta.duration) * 30;
          const bytes = meta.width * meta.height * 4 * frames;

          if (bytes > SCRUB_MEMORY_BUDGET_BYTES) {
            toast.error(
              `That clip is ${meta.width}x${meta.height} and ${Math.round(meta.duration)}s, which needs about ` +
              `${(bytes / 1024 ** 3).toFixed(1)}GB of memory to scrub — enough to crash the browser. ` +
              "Use a shorter or lower-resolution video (1080p or below), or switch to Looping, which has no such limit.",
              { duration: 15000 },
            );
            return;
          }
        }
      }
    }

    if (mode === "CINEMATIC" && videoSource === "PROMPT" && !videoPrompt.trim()) {
      toast.error("Describe the video you want, or switch back to Auto video.");
      return;
    }

    setIsRedirecting(true); // lock the button immediately, before any async work

    // The prompt and the image go with the mutation that starts the build, so
    // there is nothing to carry across the redirect: by the time the project
    // page loads, v0 is already working.
    let imageDataUrl: string | undefined;
    if (uploadedImage) {
      try {
        // Downscaled first — a full-size data URL is a large request body and
        // v0 only needs it as a visual reference.
        imageDataUrl = await processImageFile(uploadedImage);
      } catch (e) {
        // Losing the reference is not worth losing the build — carry on without it.
        console.error("Failed to attach the reference image:", e);
        toast.error("Could not attach that image — continuing without it.");
      }
    }

    try {
      await createProject.mutateAsync({
        value: values.value,
        imageDataUrl,
        mode,
        ...(mode === "CINEMATIC"
          ? {
            motion,
            videoSource,
            videoPrompt: videoSource === "PROMPT" ? videoPrompt.trim() : undefined,
            videoUrl: videoSource === "URL" ? videoUrl.trim() : undefined,
          }
          : {}),
      });
    } catch {
      // Error is handled in the mutation's onError callback
    }
  };

  const motionOption = VIDEO_MOTIONS.find((o) => o.value === motion) ?? VIDEO_MOTIONS[0];
  const sourceOption = VIDEO_SOURCES.find((o) => o.value === videoSource) ?? VIDEO_SOURCES[0];

  const isPending = createProject.isPending || isRedirecting;
  const isButtonDisabled = isPending || (!form.formState.isValid && !uploadedImage);

  return (
    <Form {...form}>
      {/* Fullscreen drag-over overlay */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <i className="ri-download-line text-white text-3xl mb-3" />
            <p className="text-lg font-sans font-medium">Drop your image</p>
          </div>
        </div>
      )}
      <section className="relative space-y-6 w-full flex flex-col items-center">
        {/* ── Main input card ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "rounded-[12px] p-3 flex flex-col relative transition-all w-full",
            isLandingPage
              // Signed-out landing composer — pinned to the bottom of the left
              // panel and deliberately left as it was.
              ? "gap-2.5 max-w-[640px] min-h-[84px] bg-white-12 shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
              // Dashboard composer, to the design spec: 680 wide, 12px padding
              // and gap, white 8% fill, a 1px fully-transparent top edge, and a
              // 106px resting height (12 + 40 textarea + 12 + 28 toolbar + 12).
              : "gap-3 max-w-[680px] min-h-[106px] bg-white-8 border-t border-white/0 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)]",
          )}
          suppressHydrationWarning
        >
          {/* Image thumbnail preview */}
          {imagePreviewUrl && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Uploaded"
                className="w-12 h-12 rounded-[4px] object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white/50 hover:text-white border border-white/10 text-xs"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          )}

          {/* Textarea */}
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                autoFocus={!isLandingPage}
                disabled={isPending}
                // The dashboard composer rests two lines tall so the box hugs
                // to the 106px in the design; the landing one stays single-line.
                minRows={isLandingPage ? 1 : 2}
                maxRows={8}
                className="block w-full bg-transparent text-sm leading-[20px] font-onest font-medium text-white-85 outline-none resize-none placeholder:text-white-50"
                placeholder="Describe your website"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          {/* ── Video detail ──
              Only the two sources that need something from the user get a
              field. Dismissing it returns the source to Auto rather than
              leaving a chip that promises input the build will never receive. */}
          {mode === "CINEMATIC" && videoSource !== "AUTO" && (
            <div className="flex items-center gap-2 rounded-[10px] border border-white-8 px-3 py-2">
              <i className={`${sourceOption.icon} shrink-0 text-base text-white-50`} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm leading-[20px] text-white-85 outline-none placeholder:text-white-50"
                disabled={isPending}
                onChange={(e) =>
                  videoSource === "URL" ? setVideoUrl(e.target.value) : setVideoPrompt(e.target.value)
                }
                placeholder={
                  videoSource === "URL"
                    ? "Paste your video URL"
                    : "Slow aerial drift over foggy peaks, 35mm grain..."
                }
                type={videoSource === "URL" ? "url" : "text"}
                value={videoSource === "URL" ? videoUrl : videoPrompt}
              />
              <button
                aria-label="Remove"
                className="shrink-0 text-white-50 transition-colors hover:text-white"
                disabled={isPending}
                onClick={() => {
                  setVideoSource("AUTO");
                  setVideoUrl("");
                  setVideoPrompt("");
                }}
                type="button"
              >
                <i className="ri-close-line text-base" />
              </button>
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg, image/png"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-7 h-7 flex shrink-0 items-center justify-center rounded-full text-white-85 hover:bg-white-8 transition-colors cursor-pointer disabled:opacity-50 text-base"
              title="Attach image"
            >
              <i className="ri-add-line text-base [text-box:trim-both_cap_alphabetic]" />
            </button>

            {showModelSelector && (
              <ComposerModelMenu
                disabled={isPending}
                onChange={setModel}
                menuPlacement={isLandingPage ? "up-on-desktop" : "down"}
                value={model}
              />
            )}

            {showModelSelector && mode === "CINEMATIC" && (
              <>
                <span aria-hidden className="h-5 w-px shrink-0 bg-white-8" />
                <ComposerChipMenu
                  ariaLabel="How the video behaves"
                  chipIcon={motionOption.icon}
                  chipLabel={motionOption.label}
                  disabled={isPending}
                  onChange={setMotion}
                  options={VIDEO_MOTIONS.map((o) => ({ ...o, title: o.label }))}
                  value={motion}
                />
                <ComposerChipMenu
                  ariaLabel="Where the video comes from"
                  chipIcon={sourceOption.icon}
                  chipLabel={sourceOption.label}
                  disabled={isPending}
                  onChange={(next) => {
                    // One visible field, two pieces of state. Without this,
                    // typing a URL and then switching the chip to "Video URL"
                    // leaves the URL stranded in videoPrompt and submits it as
                    // a description of footage to generate — which is exactly
                    // how a pasted link ended up at the video model.
                    const typed = videoSource === "URL" ? videoUrl : videoPrompt;
                    if (next === "URL") setVideoUrl(typed);
                    else if (next === "PROMPT") setVideoPrompt(typed);
                    setVideoSource(next);
                  }}
                  options={VIDEO_SOURCES}
                  value={videoSource}
                />
              </>
            )}

            <div className="flex gap-2 ml-auto shrink-0">
              {isButtonDisabled ? (
                <button
                  type="submit"
                  disabled
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white-50 text-bg"
                >
                  <i className="ri-arrow-up-line text-base" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-bg hover:bg-white-85 active:scale-95 transition-transform duration-200"
                >
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-up-line text-base" />
                  )}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* ── Template chips ── */}
        {/* <div className="hidden md:flex flex-wrap justify-center gap-2 font-sans">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.prompt)}
              className={cn(
                "inline-flex items-center px-2 py-1.5 rounded-[8px]",
                "text-sm text-white",
                "bg-[#1C1C1C4D] backdrop-blur-md  active:scale-[0.98] border border-white/5 hover:border-white/10 transition-colors"
              )}
            >
              {item.label}
            </button>
          ))}
        </div> */}
      </section>

      <CustomSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
      <CustomOutOfCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </Form>
  );
};
