"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  projectId: string;
  initialPrompt?: string;
  droppedFile?: File | null;
  onFrameGenerated: (url: string) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
  onNext: () => void;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
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
          ? { body: formData }
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, projectId }),
            }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate frames");
      }

      const data = await res.json();
      onFrameGenerated(data.frameUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex-1" />

      <div className="p-4 space-y-3">
        <div className="bg-[#1c1c1c] border border-white/5 rounded-2xl p-3 space-y-3">
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

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt here"
            className="w-full bg-transparent text-sm text-white/90 outline-none resize-none min-h-[80px]"
            disabled={isGenerating}
          />

          <div className="flex items-center gap-x-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
            >
              <i className="ri-add-line" />
            </button>

            <div className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-white/70">
              <span className="text-sm">🍌</span>
              <span>Nano Banana 2</span>
              <i className="ri-arrow-down-s-line" />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-[#333333] hover:bg-white/20 text-white disabled:opacity-30 transition-all shadow-sm"
            >
              {isGenerating ? (
                <i className="ri-loader-4-line animate-spin" />
              ) : (
                <i className="ri-arrow-up-line" />
              )}
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full rounded-xl bg-transparent border-white/5 text-white/70 hover:bg-white/5 uppercase text-[10px] font-bold tracking-[0.1em] h-10 transition-all"
          onClick={onNext}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};
