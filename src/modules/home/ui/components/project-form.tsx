"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";

const MODELS = [
  { id: "replicate-nb-2", label: "Nano Banana 2", emoji: "🍌", credits: 7 },
  { id: "replicate-gpt-2", label: "GPT 2", emoji: "🤖", credits: 3 },
] as const;

const SUGGESTED_PROMPTS = [
  {
    label: "Celestial Nebula",
    prompt: "Embark on a visual journey through a breathtaking, hyper-realistic 3D cosmic nebula masterpiece. Imagine swirling vortices of iridescent purple, deep sapphire, and molten gold gases colliding in a chaotic yet harmonious celestial dance that spans light-years. Countless glittering star clusters and distant spiral galaxies pierce through thick, volumetric clouds, creating a sense of unfathomable scale. Ethereal, shimmering dust trails weave through the composition, catching cinematic rim lighting from a nearby dying sun, creating brilliant highlights and deep, velvety shadows. The scene utilizes multi-layered transparency and refraction to build immense space depth. Rendered in 8K ultra-resolution using Octane Render, it features realistic light scatter, gravitational lensing effects, and an expansive, awe-inspiring atmosphere that captures the sheer majesty of the universe."
  },
  {
    label: "Sacred Zen Sanctuary",
    prompt: "Step into an ultra-minimalist 3D Zen garden sanctuary, rendered with obsessive attention to every microscopic detail. Perfectly raked concentric sand patterns create a mesmerizing sense of eternal flow around weathered basalt monoliths, which are covered in intricate moss textures and morning dew. A single, ancient bonsai tree stands as a poignant focal point, its delicate, hand-sculpted leaves catching the soft, golden-hour morning sunlight. The scene is populated with photorealistic pebbles of varying mineral types, clean architectural lines of a dark charred-cedar wooden deck, and a background of soft-focus bamboo swaying in a digital breeze. Utilizing studio-quality global illumination, subtle lens flares, and a serene, meditative atmosphere, this high-end architectural render boasts physically accurate shadows and crisp, 8K textures."
  },
  {
    label: "Neon Isometric Lab",
    prompt: "Welcome to a state-of-the-art 3D isometric technology workspace of the year 2099. Floating holographic interfaces pulse with vibrant neon cyan and electric magenta code snippets, casting dynamic, colorful light onto sleek, matte-black metallic surfaces and brushed aluminum frames. The desk is cluttered with high-poly futuristic gadgets, translucent glass tablets showing complex internal circuitry, and ergonomic carbon-fiber furniture with glowing orange accents. Soft ambient occlusion and real-time ray-traced reflections bring a tangible sense of reality to every corner. The aesthetic is playfully professional, featuring tiny floating data particles and microscopic dust motes dancing in the light. Octane Render 8K output, featuring shallow depth of field, volumetric light rays from hidden LED strips, and a polished, high-tech 'Silicon Valley' vibe."
  },
  {
    label: "Bioluminescent Dreamwood",
    prompt: "Descend into an immersive, enchanted 3D forest at midnight, a world brimming with bioluminescent life and ancient mystery. Massive, millennium-old trees with glowing blue fungal veins tower over a lush carpet of iridescent ferns and floating spores that drift like underwater snow. Soft, silvery moonlight filters through the dense, multi-layered canopy, creating dramatic volumetric god-rays and sharp, spindly silhouettes against the dark woods. Fireflies leave long-exposure neon light trails through the misty, moisture-rich air. The environment is incredibly rich with procedural wet moss textures, sparkling crystal formations emerging from the soil, and magical particles that react to invisible atmospheric currents. This Unreal Engine 5 style hyper-realistic environment features complex parallax mapping, ray-traced global illumination, and a deep, hauntingly beautiful fantasy atmosphere."
  }
];

type ModelId = typeof MODELS[number]["id"];

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
});

export const ProjectForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>("replicate-nb-2");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        const url = `/projects/${data.id}${variables.value ? "?autoSubmit=true" : ""}`;
        router.push(url);
      },
      onError: (error) => {
        toast.error(error.message, { duration: Infinity });

        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
        }

        if (error.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
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

    // Persist the selected model so the dashboard uses it for auto-submit
    sessionStorage.setItem("pending_model", selectedModel);

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

  const onSelect = (value: string) => {
    form.setValue("value", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
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
            <p className="text-lg font-inconsolata font-medium">Drop your image</p>
          </div>
        </div>
      )}
      <section className="space-y-6 w-full flex flex-col items-center">
        {/* ── Main input card ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative rounded-2xl overflow-hidden transition-all min-h-[148px]",
            "bg-background w-full md:w-[720px]!",
            isFocused && "ring-1 ring-white/20 border-white/20"
          )}
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.45)" }}
        >
          {/* Image thumbnail preview */}
          {imagePreviewUrl && (
            <div className="px-4 pt-4">
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded"
                  className="w-16 h-16 rounded-xl object-cover border border-white/10"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-[#333] border border-white/10 text-white/70 hover:text-white text-[10px]"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            </div>
          )}

          {/* Textarea */}
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                minRows={3}
                maxRows={10}
                className={cn(
                  "w-full resize-none border-none outline-none bg-transparent",
                  "px-4 pt-4 ",
                  "text-[15px] font-inconsolata leading-relaxed text-white",
                  "placeholder:text-neutral-400 placeholder:whitespace-nowrap placeholder:text-[14px] ",
                  "transition-colors"
                )}
                placeholder="Describe your background..."
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
          <div className="flex items-center justify-between px-4 pb-4 font-inconsolata pt-3">
            <div className="flex gap-x-1 items-center flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border border-neutral-800 hover:bg-white/5 text-white transition-colors"
              >
                <i className="ri-add-line text-base" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-full border border-neutral-800 text-xs md:text-sm text-white  hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setModelDropdownOpen((o) => !o)}
                >
                  <span>{MODELS.find((m) => m.id === selectedModel)?.emoji}</span>
                  <span>{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                  <i className="ri-arrow-down-s-line mt-0.5 text-white" />
                </div>

                {modelDropdownOpen && (
                  <div className="absolute bottom-10 left-0 z-50 bg-background border border-[#3B3B3B] rounded-[8px] overflow-hidden min-w-[180px] shadow-xl">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-inconsolata transition-colors hover:bg-white/5 ${selectedModel === model.id ? "text-white" : "text-[#CCCCCC]"}`}
                      >
                        <span>{model.emoji}</span>
                        <span>{model.label}</span>
                        {selectedModel === model.id && <i className="ri-check-line ml-auto text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">

              <div className="flex gap-2 ml-auto">
                <div className="flex items-center gap-1 mr-1 text-[#CCCCCC]">
                  <i className="ri-sparkling-fill text-white text-sm" />
                  <span className="text-sm font-medium">{MODELS.find(m => m.id === selectedModel)?.credits}</span>
                </div>
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className={cn(
                    "flex items-center justify-center size-8 rounded-full transition-all duration-150",
                    isButtonDisabled
                      ? "bg-[#333333] text-[#1C1C1C] cursor-not-allowed"
                      : "bg-white text-[#1C1C1C]"
                  )}
                >
                  {isPending ? (
                    <i className="ri-loader-4-line text-[16px] animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-up-line text-[16px]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* ── Template chips ── */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 font-inconsolata">
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
        </div>
      </section>

      <CustomSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </Form>
  );
};
