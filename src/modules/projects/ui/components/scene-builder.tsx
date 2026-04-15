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

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt here"
            className="w-full bg-transparent text-sm text-white/90 outline-none resize-none min-h-[80px] "
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
              className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent text-white transition-colors border-[0.5px] border-[#3B3B3B] px-2.5 py-2"
            >
              <i className="ri-add-line" />
            </button>

            <div className="flex items-center gap-x-1.5 px-2.5 py-2 rounded-full bg-transparent border-[0.5px] border-[#3B3B3B] text-sm text-white">
              <span className="text-sm">🍌</span>
              <span>Nano Banana 2</span>
              <i className="ri-arrow-down-s-line" />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] transition-all shadow-sm"
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
          className="w-full rounded-[8px] bg-[#1C1C1C]! border-[1px] border-[#282825] text-white font-inconsolata text-sm tracking-[0.1em] h-10"
          onClick={onNext}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};
