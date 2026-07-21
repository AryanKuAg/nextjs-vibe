"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";


import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";


const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(100000, { message: "Value is too long" }),
});

const MODELS = [
  { id: "deepseek/deepseek-v4-flash", label: "Fable 5", emoji: "" },
  { id: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol", emoji: "" },
  { id: "kimi/k3", label: "Kimi K3", emoji: "" },
  { id: "anthropic/opus-4.8", label: "Opus 4.8", emoji: "" },
  { id: "anthropic/sonnet-5", label: "Sonnet 5", emoji: "" },
];

interface ProjectFormProps {
  showModelSelector?: boolean;
  dropdownDirection?: "up" | "down";
  isLandingPage?: boolean;
}

export const ProjectForm = ({ showModelSelector = false, dropdownDirection = "down", isLandingPage = false }: ProjectFormProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Click outside to close model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    };

    if (modelDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modelDropdownOpen]);

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
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        const url = `/projects/${data.id}${variables.value ? "?builderAutoSubmit=true" : ""}`;
        router.push(url);
      },
      onError: (error) => {
        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
          return;
        }

        if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
          setShowCreditsModal(true);
        } else {
          toast.error(error.message, { duration: Infinity });
        }
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (window.innerWidth < 768) {
      setShowSignInModal(true);
      return;
    }

    if (!userId) {
      setShowSignInModal(true);
      return;
    }

    // Persist the selected model so the dashboard uses it
    sessionStorage.setItem("pending_model", selectedModel);
    sessionStorage.setItem("pending_builder_prompt", values.value);

    // Save image to sessionStorage to persist across redirect
    if (uploadedImage) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          sessionStorage.setItem("pending_image_base64", base64String);
          sessionStorage.setItem("pending_image_name", uploadedImage.name);
          sessionStorage.setItem("pending_image_type", uploadedImage.type);
          try {
            await createProject.mutateAsync({ value: values.value });
          } catch {
            // Error is handled in the mutation's onError callback
          }
        };
        reader.readAsDataURL(uploadedImage);
        return; // Success handled in reader
      } catch (e) {
        console.error("Failed to save image to session storage:", e);
      }
    }

    try {
      await createProject.mutateAsync({ value: values.value });
    } catch {
      // Error is handled in the mutation's onError callback
    }
  };

  const isPending = createProject.isPending;
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
      <section className="space-y-6 w-full flex flex-col items-center">
        {/* ── Main input card ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={`rounded-[12px] p-3 space-y-3 relative transition-all w-full max-w-[640px] border focus-within:border-purple ${isLandingPage ? "bg-transparent border-white-8" : "bg-grey-bg border border-white-8 shadow-[0_4px_16px_rgba(0,0,0,0.25)] "}`}
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
                minRows={1}
                maxRows={12}
                className="w-full bg-transparent text-sm leading-[20px] text-white-85 outline-none resize-none min-h-[24px] placeholder:text-white-50 "
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

          {/* Bottom toolbar */}
          <div className="flex items-center gap-1 mt-2">
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
              className="w-7 h-7 flex shrink-0 items-center justify-center rounded-[8px] border border-white-8 text-white hover:bg-white-8 cursor-pointer disabled:opacity-50 text-base"
              title="Attach image"
            >
              <i className="ri-add-line text-base" />
            </button>

            {showModelSelector && (
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-7 px-2 flex items-center gap-1 rounded-lg border border-white-8 text-sm leading-[20px] text-white-85 hover:bg-white-8 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModelDropdownOpen((o) => !o)}
                >
                  <span className="whitespace-nowrap">{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                  <i className={`ri-arrow-${modelDropdownOpen ? 'up' : 'down'}-s-line text-white-85 text-xs`} />
                </div>

                <AnimatePresence>
                  {modelDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: dropdownDirection === "up" ? 4 : -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: dropdownDirection === "up" ? 4 : -4, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={`absolute ${dropdownDirection === "up" ? "bottom-9" : "top-9"} left-0 z-50 bg-grey-bg border border-white-4 rounded-[8px] overflow-hidden min-w-[180px] shadow-xl p-1 gap-[2px] flex flex-col`}
                    >
                      {MODELS.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between gap-3 px-2 py-2.5 text-sm font-sans rounded-[4px]  hover:bg-white-8 h-[28px] text-white-85`}
                        >
                          <span className="whitespace-nowrap">{model.label}</span>
                          {selectedModel === model.id && <i className="ri-check-line text-white" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex gap-2 ml-auto shrink-0">
              {isButtonDisabled ? (
                <button
                  type="submit"
                  disabled
                  className="w-7 h-7 flex items-center justify-center rounded-full  bg-purple text-white opacity-50"
                >
                  <i className="ri-arrow-up-line text-base" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-7 h-7 flex items-center justify-center rounded-full  bg-purple text-white hover:bg-purple/80 active:scale-95 transition-transform duration-200"
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
