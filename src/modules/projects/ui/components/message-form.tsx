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
import { cn } from "@/lib/utils";

type ModelId =
  | "deepseek/deepseek-v4-flash"
  | "deepseek/deepseek-v4-pro";

interface Props {
  projectId: string;
  stage?: "SCENE" | "VIDEO" | "SITE";
  extractedZipUrl?: string | null;
  extractedFrameCount?: number;
  isGenerating?: boolean;
  initialPrompt?: string;
  pendingInteractiveAction?: string | null;
  setPendingInteractiveAction?: (action: string | null) => void;
  setIsInteractiveSubmitted?: (v: boolean) => void;
};

const formSchema = z.object({
  value: z.string()
    .min(1, { message: "Value is required" })
    .max(100000, { message: "Value is too long" }),
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

const TEMPLATES = [
  { icon: "ri-macbook-line", label: "Portfolio website" },
  { icon: "ri-box-3-line", label: "3D product showcase" },
  { icon: "ri-layout-masonry-line", label: "Creative agency website" },
];

export const MessageForm = ({ projectId, stage = "SITE", extractedZipUrl, extractedFrameCount, isGenerating, initialPrompt, pendingInteractiveAction, setPendingInteractiveAction, setIsInteractiveSubmitted }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const selectedModel: ModelId = "deepseek/deepseek-v4-flash";
  const MODEL_CREDITS = MODEL_COSTS[selectedModel] ?? 65;
  const FOLLOW_UP_CREDITS = FOLLOW_UP_COSTS[selectedModel] ?? 10;
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isInteractiveSubmitting, setIsInteractiveSubmitting] = useState(false);

  // Focus textarea when a pending action is set
  useEffect(() => {
    if (pendingInteractiveAction && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [pendingInteractiveAction]);

  // Detect follow-up: any existing SITE-stage message means this is a follow-up prompt
  const { data: existingMessages } = useQuery({
    ...trpc.messages.getMany.queryOptions({ projectId, stage }),
    staleTime: 30_000,
  });
  const isFollowUp = stage === "SITE" && (existingMessages?.length ?? 0) > 0;
  
  const lastMessage = existingMessages?.[(existingMessages?.length ?? 0) - 1];
  const isWaitingForInteractive = lastMessage?.role === "ASSISTANT" && lastMessage?.type === "INTERACTIVE";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { value: initialPrompt || "" },
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pendingPrompt = sessionStorage.getItem("pending_builder_prompt");
      if (pendingPrompt && !form.getValues().value && !isFollowUp) {
        form.setValue("value", pendingPrompt, { shouldValidate: true });
        sessionStorage.removeItem("pending_builder_prompt");
      } else if (initialPrompt && !form.getValues().value && !isFollowUp) {
        form.setValue("value", initialPrompt, { shouldValidate: true });
      }

      const pendingImage = sessionStorage.getItem("pending_image_base64");
      if (pendingImage) {
        setUploadedDataUrl(pendingImage);
        sessionStorage.removeItem("pending_image_base64");
        sessionStorage.removeItem("pending_image_name");
        sessionStorage.removeItem("pending_image_type");
      }
    }
  }, [initialPrompt, form, isFollowUp]);

  const cancelGeneration = useMutation(trpc.projects.cancelGeneration.mutationOptions({
    onSuccess: () => {
      toast.success("Generation stopped");
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
    }
  }));

  const startAutonomousGeneration = useMutation(trpc.projects.startAutonomousGeneration.mutationOptions({
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
    if (pendingInteractiveAction) {
      setIsInteractiveSubmitting(true);
      try {
        await fetch("/api/inngest/user-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, action: pendingInteractiveAction, payload: values.value }),
        });
        form.setValue("value", "");
        setPendingInteractiveAction?.(null);
        setIsInteractiveSubmitted?.(true);
      } catch (error) {
        console.error(error);
        toast.error("Failed to send response");
      } finally {
        setIsInteractiveSubmitting(false);
      }
      return;
    }

    try {
      await startAutonomousGeneration.mutateAsync({
        prompt: values.value,
        projectId,
        model: selectedModel,
        isAgentMode: isAgentActive,
      });
      form.setValue("value", "");
      setUploadedDataUrl(null);
    } catch {
      // Error handled in onError
    }
  };

  const isPending = startAutonomousGeneration.isPending;
  const promptValue = form.watch("value");
  const isButtonDisabled = isPending || isInteractiveSubmitting || (!promptValue?.trim() && !isGenerating);

  return (
    <div className="flex flex-col w-full">
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageSelect}
      />

      {!isFollowUp && (
        <div className="flex flex-col gap-2 mb-4 px-1">
          {TEMPLATES.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => form.setValue("value", t.label, { shouldValidate: true })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#222] hover:bg-white/5 transition-colors self-start text-sm text-white bg-transparent"
            >
              <i className={`${t.icon} text-[#888]`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-[#1c1c1c] rounded-[16px] p-3 pt-4 space-y-3 relative transition-all duration-300 ${isDragOver ? "ring-1 ring-white/30 bg-white/5" : ""} ${pendingInteractiveAction ? "ring-1 ring-[#5b36ff] shadow-[0_0_15px_rgba(91,54,255,0.15)]" : ""}`}
        >
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
                ref={(e) => {
                  field.ref(e);
                  textareaRef.current = e;
                }}
                disabled={isPending || isInteractiveSubmitting}
                minRows={1}
                maxRows={12}
                className="w-full bg-transparent text-[15px] text-white outline-none resize-none min-h-[24px] placeholder:text-[#737373]"
                placeholder={pendingInteractiveAction ? "Enter your prompt..." : "Describe your website..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isPending}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#333] text-white hover:bg-white/10 transition-colors disabled:opacity-50 text-base"
              title="Attach image"
            >
              <i className="ri-add-line" />
            </button>
            <div
              onClick={() => {
                if (pendingInteractiveAction || isGenerating || isPending || isWaitingForInteractive) return;
                setIsAgentActive(!isAgentActive);
              }}
              className={cn(
                "h-8 px-3 flex items-center rounded-lg border text-sm transition-colors select-none",
                isAgentActive
                  ? "bg-white text-black border-white"
                  : "border-[#333] text-white hover:bg-white/10",
                (pendingInteractiveAction || isGenerating || isPending || isWaitingForInteractive)
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              )}
            >
              Agent
            </div>

            <div className="flex gap-2 ml-auto">
              {(isGenerating || (isWaitingForInteractive && !pendingInteractiveAction)) ? (
                <button
                  type="button"
                  onClick={() => cancelGeneration.mutate({ projectId })}
                  disabled={cancelGeneration.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-[#fefefe] transition-all"
                >
                  <i className={cancelGeneration.isPending ? "ri-loader-4-line animate-spin" : "ri-stop-fill"} />
                </button>
              ) : isButtonDisabled ? (
                <button
                  type="submit"
                  disabled
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-all",
                    pendingInteractiveAction
                      ? "bg-[#5b36ff] opacity-50 text-white"
                      : "bg-[#333] text-[#777]"
                  )}
                >
                  <i className="ri-arrow-up-line font-bold" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full transition-all",
                    pendingInteractiveAction
                      ? "bg-[#5b36ff] text-white hover:bg-[#4a2ce6]"
                      : "bg-white text-black hover:bg-[#ddd]"
                  )}
                >
                  {isPending ? (
                    <i className="ri-loader-4-line animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-up-line font-bold" />
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
