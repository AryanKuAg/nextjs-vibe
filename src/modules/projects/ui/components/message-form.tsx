"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useRef, useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { FOLLOW_UP_COSTS, MODEL_COSTS } from "@/lib/pricing";
import { Hint } from "@/components/hint";

const MODELS = [
  { id: "minimax/minimax-m3", label: "Minimax M3" },
] as const;

type ModelId = typeof MODELS[number]["id"];

interface Props {
  projectId: string;
  stage?: "SCENE" | "VIDEO" | "SITE";
  extractedZipUrl?: string | null;
  extractedFrameCount?: number;
  isGenerating?: boolean;
  mode?: "video" | "interactive";
  blocks?: any[];
};

const formSchema = z.object({
  value: z.string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
})

const processImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      reject(new Error("Unsupported format. Use JPEG, PNG, WebP, or GIF."));
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      reject(new Error("Image must be under 7MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } else {
          resolve(ev.target?.result as string);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

export const MessageForm = ({ projectId, stage = "SITE", extractedZipUrl, extractedFrameCount, isGenerating, mode, blocks }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>("minimax/minimax-m3");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const SELECTED_MODEL_DATA = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const MODEL_CREDITS = MODEL_COSTS[selectedModel] ?? 65;
  const FOLLOW_UP_CREDITS = FOLLOW_UP_COSTS[selectedModel] ?? 10;
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Detect follow-up: any existing SITE-stage message means this is a follow-up prompt
  const { data: existingMessages } = useQuery({
    ...trpc.messages.getMany.queryOptions({ projectId, stage }),
    staleTime: 30_000,
  });
  const isFollowUp = stage === "SITE" && (existingMessages?.length ?? 0) > 0;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { value: "" },
  });

  const cancelGeneration = useMutation(trpc.projects.cancelGeneration.mutationOptions({
    onSuccess: () => {
      toast.success("Generation stopped");
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
    }
  }));

  const buildSite = useMutation(trpc.projects.buildSite.mutationOptions({
    onSuccess: () => {
      form.reset();
      setUploadedDataUrl(null);
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
      queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error.message, { duration: Infinity });
      }
    },
  }));

  const createMessage = useMutation(trpc.messages.create.mutationOptions({
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error.message, { duration: Infinity });
      }
    },
  }));

  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: form.getValues().value, type: "code", projectId, extractedZipUrl })
      });
      const data = await res.json();
      if (res.ok && data.prompt) {
        form.setValue("value", data.prompt, { shouldValidate: true });
        toast.success("Prompt enhanced successfully!");
      } else {
        toast.error("Failed to enhance prompt: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while enhancing prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await processImageFile(file);
      setUploadedDataUrl(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load image.");
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (stage === "SITE") {
      // Validate media based on mode
      if (mode === "video") {
        const hasVideos = blocks?.some((b: any) => b.videoUrl);
        if (!hasVideos) {
          toast.error("Please generate a video before building the site.");
          return;
        }
      } else if (mode === "interactive") {
        if (!extractedZipUrl || !extractedFrameCount) {
          toast.error("Please generate videos and extract frames before building the site.");
          return;
        }
      }

      // Infer templateId if the videoUrl matches a predefined template
      let templateId: string | undefined;
      const firstVideoUrl = blocks?.[0]?.videoUrl;
      if (firstVideoUrl) {
        const { TEMPLATES } = await import("@/lib/templates");
        const matchedTemplate = TEMPLATES.find(t => t.blocks?.[0]?.videoUrl === firstVideoUrl);
        if (matchedTemplate) {
          templateId = matchedTemplate.id;
        }
      }

      try {
        await buildSite.mutateAsync({
          value: values.value,
          projectId,
          videoUrl: mode === "video" ? blocks?.[0]?.videoUrl : (extractedZipUrl || undefined),
          frameCount: extractedFrameCount,
          model: selectedModel,
          isFollowUp,
          imageDataUrl: uploadedDataUrl ?? undefined,
          templateId,
          mode,
        });
      } catch {
        // Error is handled in the mutation's onError callback
      }
    } else {
      try {
        await createMessage.mutateAsync({
          value: values.value,
          projectId,
          stage,
          model: selectedModel,
        });
      } catch {
        // Error is handled in the mutation's onError callback
      }
    }
  };

  const isPending = createMessage.isPending || buildSite.isPending;
  const isButtonDisabled = isPending || (!form.formState.isValid && !isGenerating);

  return (
    <>
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageSelect}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-[#282828] border rounded-[16px] p-3 space-y-3 relative transition-all ${isDragOver ? "border-white/30 bg-white/5" : "border-[#2c2c2c]"
            }`}
        >
          {/* Image preview — same style as video-builder */}
          {uploadedDataUrl && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedDataUrl}
                alt="Attached image"
                className="w-16 h-16 rounded-[4px] object-cover"
              />
              <button
                type="button"
                onClick={() => setUploadedDataUrl(null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white/50 hover:text-white border border-white/10 text-xs"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          )}

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                minRows={2}
                maxRows={12}
                className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[36px] placeholder:text-[#737373]"
                placeholder="Prompt to generate website"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          <div className="flex items-center gap-x-1">
            {/* + Image attach button — before model name */}
            <Hint text="Add photo" side="top" align="start">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isPending}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-[#333333] text-white hover:bg-white/5 transition-colors disabled:opacity-50 text-base leading-none"
                title="Attach image"
              >
                <i className="ri-add-line text-lg" />
              </button>
            </Hint>

            {/* Enhance prompt */}
            <Hint text="Generate prompt" side="top" >
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="h-8 px-2 flex items-center justify-center rounded-full border border-[#333333] text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isEnhancing ? (
                  <i className="ri-loader-4-line animate-spin text-[15px]" />
                ) : (
                  <i className="ri-magic-line text-[15px]" />
                )}
              </button>
            </Hint>

            <div className="flex gap-2 ml-auto">
              <div className="flex items-center gap-1 text-white">
                <i className="ri-sparkling-2-fill text-white text-sm" />
                <span className="text-sm font-medium">
                  {isFollowUp ? FOLLOW_UP_CREDITS : MODEL_CREDITS}
                </span>
              </div>
              {isGenerating ? (
                <button
                  type="button"
                  onClick={() => cancelGeneration.mutate({ projectId })}
                  disabled={cancelGeneration.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent text-[#fefefe] transition-all shadow-sm active:scale-95 border border-[#333333]"
                >
                  <i className={cancelGeneration.isPending ? "ri-loader-4-line animate-spin" : "ri-stop-fill"} />
                </button>
              ) : isButtonDisabled ? (
                <button
                  type="submit"
                  disabled
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#1C1C1C] disabled:bg-[#666666] disabled:text-[#444] transition-all shadow-sm"
                >
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-right-line" />
                  )}
                </button>
              ) : (
                <Hint text="Generate" side="top">
                  <button
                    type="submit"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#1C1C1C] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
                  >
                    {isPending ? (
                      <i className="ri-loader-4-line animate-spin inline-block" />
                    ) : (
                      <i className="ri-arrow-right-line" />
                    )}
                  </button>
                </Hint>
              )}
            </div>
          </div>
        </form>
      </Form>
    </>
  );
};
