"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";

interface Props {
  projectId: string;
  initialPrompt?: string;
  droppedFile?: File | null;
  onFrameGenerated: (url: string) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
  onNext: () => void;
}

const MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2", emoji: "🍌" },
  { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro", emoji: "🍌" },
] as const;

type ModelId = typeof MODELS[number]["id"];

export const SceneBuilder = ({
  projectId,
  initialPrompt = "",
  droppedFile,
  onFrameGenerated,
  onGeneratingChange,
  onNext,
}: Props) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-3.1-flash-image-preview");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Keep prompt in sync with initialPrompt if it arrives late
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Track if we've already tried to auto-submit to avoid infinite loops
  const hasAutoSubmitted = useRef(false);

  // Auto-submit if requested via query param
  useEffect(() => {
    const autoSubmit = searchParams.get("autoSubmit") === "true";
    if (autoSubmit && initialPrompt && !isGenerating && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      // Trigger the generation
      handleSubmit();

      // Clean up the URL so it doesn't re-trigger on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("autoSubmit");
      const newQuery = params.toString();
      const newUrl = `${pathname}${newQuery ? `?${newQuery}` : ""}`;
      router.replace(newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Accept a file dropped from the parent (right panel drag-drop)
  useEffect(() => {
    if (droppedFile) {
      handleImageFile(droppedFile);
    }
  }, [droppedFile]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleImageFile = (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error("Unsupported image format. Please use JPEG or PNG.");
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedImage(file);
    setImagePreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const removeImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setUploadedImage(null);
    setImagePreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() && !uploadedImage) return;

    setIsGenerating(true);
    onGeneratingChange?.(true);
    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("projectId", projectId);
      if (uploadedImage) formData.append("image", uploadedImage);

      const res = await fetch("/api/generate-frames", {
        method: "POST",
        ...(uploadedImage
          ? { body: (() => { formData.append("model", selectedModel); return formData; })() }
          : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, projectId, model: selectedModel }),
          }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate frames");
      }

      const data = await res.json();
      onFrameGenerated(data.frameUrl);
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message?.toLowerCase().includes("credits") || err?.message?.toLowerCase().includes("too many requests")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  return (
    <>
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <div className="flex flex-col h-full bg-[#1C1C1C] font-inconsolata">
        <div className="flex-1" />

        <div className="p-4 space-y-3">
          <div className="bg-[#272725] border border-[#282825] rounded-[8px] p-3 space-y-3">
            {/* Image thumbnail preview */}
            {imagePreviewUrl && (
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
            )}

            <TextareaAutosize
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Prompt here"
              minRows={3}
              maxRows={14}
              className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[80px]"
              disabled={isGenerating}
            />

            <div className="flex items-center gap-x-2">
              {/* Hidden file input */}
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
                className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-[0.5px] border-[#3B3B3B] hover:bg-white/5 text-[#CCCCCC] transition-colors"
              >
                <i className="ri-add-line text-base" />
              </button>

              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-full border-[0.5px] border-[#3B3B3B] text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setModelDropdownOpen((o) => !o)}
                >
                  <span className="text-sm">🍌</span>
                  <span>{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                  <i className="ri-arrow-down-s-line mt-0.5 text-white" />
                </div>

                {modelDropdownOpen && (
                  <div className="absolute bottom-10 left-0 z-50 bg-[#272725] border border-[#3B3B3B] rounded-[8px] overflow-hidden min-w-[180px] shadow-xl">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-inconsolata transition-colors hover:bg-white/5 ${selectedModel === model.id ? "text-white" : "text-[#CCCCCC]"
                          }`}
                      >
                        <span>{model.label}</span>
                        {selectedModel === model.id && <i className="ri-check-line ml-auto text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
              >
                {isGenerating ? (
                  <i className="ri-loader-4-line animate-spin inline-block" />
                ) : (
                  <i className="ri-arrow-up-line text-[#1C1C1C]" />
                )}
              </button>
            </div>
          </div>

          <Button
            className="w-full rounded-[8px] bg-[#1C1C1C]! border-[1px] border-[#282825] text-white font-inconsolata text-sm h-9 hover:bg-white/5! font-[400]"
            onClick={onNext}
          >
            Skip
          </Button>
        </div>
      </div>
    </>
  );
};
