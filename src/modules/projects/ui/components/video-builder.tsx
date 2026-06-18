import { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { MODEL_COSTS } from "@/lib/pricing";

const MODEL_IDS = [
  { id: "kwaivgi/kling-v3-video", label: "Kling 3.0" },
  { id: "replicate-prunaai/p-video", label: "Pruna" },
  { id: "replicate-prunaai/p-video-draft", label: "Pruna Draft" },
  { id: "openrouter-seedance-2", label: "Seedance 2.0" },
  { id: "openrouter-seedance-2-fast", label: "Seedance 2.0 Fast" },
  { id: "gcp-veo-3.1-lite", label: "Veo 3.1" },
] as const;

type ModelId = typeof MODEL_IDS[number]["id"];

const MODELS = MODEL_IDS.map((m) => ({ ...m, credits: MODEL_COSTS[m.id] ?? 0 }));

interface Props {
  projectId: string;
  selectedSceneUrl: string | null;
  isGenerating: boolean;
  onNext: () => void;
  onBack: () => void;
  onClearSelection?: () => void;
  droppedFile?: File | null;
}

export const VideoBuilder = ({ projectId, selectedSceneUrl, isGenerating, onBack, onClearSelection, droppedFile }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>("kwaivgi/kling-v3-video");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert a dropped File into a clean JPEG via Canvas
  useEffect(() => {
    if (!droppedFile) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(droppedFile.type)) {
      toast.error("Unsupported image format. Please use JPEG, PNG, or WebP.", { duration: Infinity });
      return;
    }
    if (droppedFile.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB", { duration: Infinity });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill white background to safely remove transparent alpha channels
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          // Export as clean standard JPEG
          const jpegBase64 = canvas.toDataURL("image/jpeg", 0.9);
          setUploadedBase64(jpegBase64);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(droppedFile);
  }, [droppedFile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const startVideoGeneration = useMutation(
    trpc.projects.startVideoGeneration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        toast.info("Started generating video. This will take a few minutes...");
        // Don't auto-clear image or prompt so user can iterate
      },
      onError: (error) => {
        if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
          setShowCreditsModal(true);
        } else {
          toast.error(error.message || "Failed to start video generation", { duration: Infinity });
        }
      }
    })
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error("Unsupported image format. Please use JPEG, PNG, or WebP.", { duration: Infinity });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB", { duration: Infinity });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const jpegBase64 = canvas.toDataURL("image/jpeg", 0.9);
          setUploadedBase64(jpegBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const hasImage = selectedSceneUrl || uploadedBase64;
    if (!prompt.trim() || isGenerating || !hasImage) return;

    try {
      await startVideoGeneration.mutateAsync({
        projectId,
        prompt,
        imageUrl: selectedSceneUrl || undefined,
        imageBase64: uploadedBase64 || undefined,
        model: selectedModel
      });
    } catch {
      // Error is handled in the mutation's onError callback
    }
  };

  const currentImage = uploadedBase64 || selectedSceneUrl;

  return (
    <>
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <div className="flex flex-col h-full bg-background relative">
        <div className="flex-1" />

        <div className="p-4 space-y-3">
          <div className="bg-[#272725] rounded-[8px] p-3 space-y-3">
            {/* Image thumbnail preview or Upload Box */}
            {currentImage ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt="Selected scene"
                  className="w-16 h-16 rounded-[4px] object-cover"
                />
                <button
                  onClick={() => {
                    setUploadedBase64(null);
                    onClearSelection?.();
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white/50 hover:text-white border border-white/10 text-xs"
                >
                  <i className="ri-close-line" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-16 h-16 rounded-[4px] border border-dashed border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={handleImageUpload} />
                <i className="ri-image-line text-white/30 text-xl" />
              </label>
            )}

            <TextareaAutosize
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create"
              minRows={3}
              maxRows={14}
              className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[80px] placeholder:text-sm"
              disabled={isGenerating || startVideoGeneration.isPending}
            />

            <div className="flex items-center gap-x-2">
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-8 pl-2.5 pr-2 flex items-center gap-1 rounded-full border-[0.5px] border-[#3B3B3B] text-sm text-white hover:bg-white/5 transition-colors cursor-pointer tracking-[0em] whitespace-nowrap"
                  onClick={() => setModelDropdownOpen((o) => !o)}
                >
                  <span className="whitespace-nowrap">{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                  <i className="ri-arrow-down-s-line mt-0.5 text-white text-base" />
                </div>

                {modelDropdownOpen && (
                  <div className="absolute bottom-10 left-0 z-50 bg-[#272725] border border-[#3B3B3B] rounded-[8px] overflow-hidden min-w-[240px] shadow-xl">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-onest transition-colors hover:bg-white/5 ${selectedModel === model.id ? "text-white" : "text-[#CCCCCC]"
                          }`}
                      >
                        <div className="flex w-full items-center font-onest whitespace-nowrap">
                          <span className="whitespace-nowrap">{model.label}</span>
                          {selectedModel === model.id && <i className="ri-check-line ml-auto text-white ml-2" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-auto justify-end">
                <div className="flex items-center gap-1 text-[#CCCCCC]">
                  <i className="ri-sparkling-fill text-white text-sm" />
                  <span className="text-sm font-medium">{MODELS.find(m => m.id === selectedModel)?.credits}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isGenerating || startVideoGeneration.isPending || !prompt.trim() || !currentImage}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
                >
                  {isGenerating || startVideoGeneration.isPending ? (
                    <i className="ri-loader-4-line animate-spin inline-block" />
                  ) : (
                    <i className="ri-arrow-up-line text-[#272725]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Button
            className="w-full rounded-[8px] bg-background! border-[1px] border-[#282825] text-white font-onest text-sm h-9 hover:bg-white/5! font-[400]"
            onClick={onBack}
          >
            Back
          </Button>
        </div>
      </div>
    </>
  );
};

