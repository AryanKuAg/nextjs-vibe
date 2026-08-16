"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { processImageFile } from "@/lib/process-image-file";
import Image from "next/image";
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
  // we're keeping the same deepseek model everything but on the frontend we're showing different models
  { id: "google/gemini-3.5-flash-lite", label: "Fable 5", emoji: "" },
  { id: "google/gemini-3.5-flash-lite", label: "GPT-5.6 Sol", emoji: "" },
  { id: "google/gemini-3.5-flash-lite", label: "Kimi K3", emoji: "" },
  { id: "google/gemini-3.5-flash-lite", label: "Opus 5", emoji: "" },
  { id: "google/gemini-3.5-flash-lite", label: "Sonnet 5", emoji: "" },
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
  // Stays true from submit through navigation so the button can't fire twice
  // (createProject.isPending briefly drops between success and the route change,
  // and the image branch defers the mutation inside a FileReader callback).
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].label);
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
      await createProject.mutateAsync({ value: values.value, imageDataUrl });
    } catch {
      // Error is handled in the mutation's onError callback
    }
  };

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
        {/* ── Perspective grid backdrop ──
            Full-bleed, so it has to break out of the page's max-width column.
            It stays first in the DOM and neither it nor the card carries a
            z-index, which is what puts the card in front of it. */}
        {!isLandingPage && (
          <div
            aria-hidden
            className="pointer-events-none select-none absolute left-1/2 top-1/2 w-screen -translate-x-1/2 -translate-y-[60%]"
          >
            <Image
              src="/grid-pattern.svg"
              alt=""
              width={1431}
              height={411}
              priority
              className="w-full h-auto opacity-12"
            />
          </div>
        )}

        {/* ── Main input card ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={`rounded-[12px] p-3 space-y-3 relative transition-all w-full max-w-[640px] ${isLandingPage ? "bg-transparent border-white-8  border focus-within:border-purple" : "beam-border  bg-grey-bg border border-white-8 shadow-[0_4px_16px_rgba(0,0,0,0.25)] "}`}
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
                className="w-full bg-transparent text-sm leading-[20px] text-white-85 outline-none resize-none min-h-[48px] placeholder:text-white-50 "
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
          <div className="flex items-center mt-2">
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
              className="w-7 h-7 flex shrink-0 items-center justify-center rounded-[8px]  text-white-85 hover:bg-white-4 cursor-pointer disabled:opacity-50 text-base"
              title="Attach image"
            >
              <i className="ri-add-line text-base" />
            </button>

            {showModelSelector && (
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-7 px-2 flex items-center gap-1 rounded-lg text-sm leading-[20px] text-white-85 hover:bg-white-4 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModelDropdownOpen((o) => !o)}
                >
                  <span className="whitespace-nowrap">{selectedModel}</span>
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
                          key={model.label}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedModel(model.label); setModelDropdownOpen(false); }}
                          className={`w-full flex items-center justify-between gap-3 px-2 py-2.5 text-sm font-sans rounded-[4px]  hover:bg-white-8 h-[28px] text-white-85`}
                        >
                          <span className="whitespace-nowrap">{model.label}</span>
                          {selectedModel === model.label && <i className="ri-check-line text-white" />}
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
