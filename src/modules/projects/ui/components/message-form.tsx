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
import { cn } from "@/lib/utils";

type ModelId =
  | "google/gemini-3.1-flash-lite";

interface Props {
  projectId: string;
  stage?: "SCENE" | "VIDEO" | "SITE";
  extractedZipUrl?: string | null;
  extractedFrameCount?: number;
  isGenerating?: boolean;
  initialPrompt?: string;
  pendingInteractiveAction?: string | null;
  setPendingInteractiveAction?: (action: string | null) => void;
  setInteractiveSubmittedAt?: (v: Date | null) => void;
};

import { processImageFile } from "@/lib/process-image-file";

const formSchema = z.object({
  value: z.string()
    .min(1, { message: "Value is required" })
    .max(100000, { message: "Value is too long" }),
})



export const MessageForm = ({ projectId, stage = "SITE", isGenerating, initialPrompt, pendingInteractiveAction, setPendingInteractiveAction, setInteractiveSubmittedAt }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectedModel: ModelId = "google/gemini-3.1-flash-lite";
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
  const hasBuiltWebsite = existingMessages?.some((m: { type: string }) => m.type === "RESULT") ?? false;

  const lastMessage = existingMessages?.[(existingMessages?.length ?? 0) - 1];
  const isWaitingForInteractive = lastMessage?.role === "ASSISTANT" && lastMessage?.type === "INTERACTIVE";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { value: initialPrompt || "" },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pendingImage = sessionStorage.getItem("pending_image_base64");
    if (pendingImage) {
      setUploadedDataUrl(pendingImage);
      sessionStorage.removeItem("pending_image_base64");
      sessionStorage.removeItem("pending_image_name");
      sessionStorage.removeItem("pending_image_type");
    }

    const pendingPrompt = sessionStorage.getItem("pending_builder_prompt");
    if (pendingPrompt && !isFollowUp) {
      // Consume immediately so a StrictMode double-mount can't fire twice.
      sessionStorage.removeItem("pending_builder_prompt");

      // Optimistically show the user's message right now — no textarea
      // populate flash, no waiting for the server round-trip. The mutation's
      // onSuccess invalidation reconciles this with the real message.
      const queryKey = trpc.messages.getMany.queryOptions({ projectId, stage }).queryKey;
      queryClient.setQueryData(queryKey, (old) => {
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          content: pendingPrompt,
          role: "USER",
          type: "RESULT",
          stage,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId,
          fragment: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Array.isArray(old) ? [...(old as any[]), optimistic] : [optimistic];
      });

      // Fire the generation directly — no visible form population, no delay.
      // The handed-off image is passed explicitly: setUploadedDataUrl above has
      // not been applied yet within this same effect run, so reading the state
      // here would silently drop it.
      startAutonomousGeneration.mutate({
        prompt: pendingPrompt,
        projectId,
        model: selectedModel,
        imageDataUrl: pendingImage ?? undefined,
      });
    } else if (initialPrompt && !form.getValues().value && !isFollowUp) {
      form.setValue("value", initialPrompt, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setInteractiveSubmittedAt?.(new Date());
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
        // What the agent does with it — start frame, look to match, or layout to
        // reproduce — is classified server-side from this prompt.
        imageDataUrl: uploadedDataUrl ?? undefined,
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

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-gray-bg rounded-[12px] p-3 space-y-3 relative border ${isDragOver ? "ring-1 ring-white/30 bg-white/5" : ""} ${pendingInteractiveAction || isFocused ? "border-purple shadow-[0_0_15px_rgba(91,54,255,0.15)]" : "border-white-8"}`}
        >
          {uploadedDataUrl && (
            <div className="relative w-fit mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedDataUrl}
                alt="Attached image"
                className="w-12 h-12 rounded-[4px] object-cover"
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
                className="w-full bg-transparent text-[14px] placeholder:text-[14px] text-white outline-none resize-none min-h-[24px] placeholder:text-white/50 mb-0 ring-0"
                placeholder={pendingInteractiveAction ? "Enter your prompt..." : hasBuiltWebsite ? "Ask your changes..." : "Describe your website..."}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
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
              className="w-7 h-7 flex items-center justify-center rounded-[8px] border border-[#333] text-white hover:bg-white/10 transition-colors disabled:opacity-50 text-base"
              title="Attach image"
            >
              <i className="ri-add-line" />
            </button>


            <div className="flex gap-2 ml-auto">
              {(isGenerating || (isWaitingForInteractive && !pendingInteractiveAction)) ? (
                <button
                  type="button"
                  onClick={() => cancelGeneration.mutate({ projectId })}
                  disabled={cancelGeneration.isPending}
                  className="w-7 h-7 flex items-center justify-center rounded-full border border-white-8 hover:bg-white-8 text-white "
                >
                  {cancelGeneration.isPending ? (
                    <i className="ri-loader-4-line animate-spin" />
                  ) : (
                    <div className="w-[10px] h-[10px] bg-current rounded-[2px]" />
                  )}
                </button>
              ) : isButtonDisabled ? (
                <button
                  type="submit"
                  disabled
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full ",
                    pendingInteractiveAction
                      ? "bg-purple opacity-50 text-white"
                      : "bg-purple/50 text-[#777]"
                  )}
                >
                  <i className="ri-arrow-up-line font-bold" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full ",
                    pendingInteractiveAction
                      ? "bg-purple text-white hover:bg-purple/60"
                      : "bg-purple text-white hover:bg-purple/80 "
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
    </div >
  );
};
