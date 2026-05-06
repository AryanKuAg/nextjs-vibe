"use client";

import { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";

import { VideoBlock } from "./background-builder-right";

type BlockTab = "START" | "END" | "VIDEO";

interface Props {
  activeBlockIndex: number;
  activeBlockTab: BlockTab;
  onTabChange: (tab: BlockTab) => void;
  onProceed: () => void;
  updateBlock: (index: number, updates: Partial<VideoBlock>) => void;
  projectId: string;
  blocks: VideoBlock[];
  isExtracting?: boolean;
}

const MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2", emoji: "🍌", credits: 7, type: "IMAGE" },
  { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro", emoji: "🍌", credits: 14, type: "IMAGE" },
  { id: "veo-3.1-lite-generate-001", label: "Veo 3.1 Lite", emoji: "", credits: 25, type: "VIDEO" },
  { id: "veo-3.1-fast-generate-001", label: "Veo 3.1 Fast", emoji: "", credits: 65, type: "VIDEO" },
];

export const BackgroundBuilderLeft = ({
  activeBlockIndex,
  activeBlockTab,
  onTabChange,
  onProceed,
  updateBlock,
  projectId,
  blocks,
  isExtracting
}: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isVideo = activeBlockTab === "VIDEO";
  const isStart = activeBlockTab === "START";
  const isEnd = activeBlockTab === "END";

  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentBlock = blocks[activeBlockIndex] || {};

  const isCurrentTabGenerating = 
    (isStart && currentBlock.isGeneratingStart) ||
    (isEnd && currentBlock.isGeneratingEnd) ||
    (isVideo && currentBlock.isGeneratingVideo);

  const shouldShowSpinner = isGenerating || isCurrentTabGenerating;

  const prompt = isVideo ? (currentBlock.videoPrompt || "") : isStart ? (currentBlock.startPrompt || "") : (currentBlock.endPrompt || "");
  const uploadedImage = isStart ? currentBlock.startUploadedImage : isEnd ? currentBlock.endUploadedImage : null;

  const setUploadedImage = (file: File | null) => {
    if (isStart) updateBlock(activeBlockIndex, { startUploadedImage: file });
    else if (isEnd) updateBlock(activeBlockIndex, { endUploadedImage: file });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    if (isVideo) updateBlock(activeBlockIndex, { videoPrompt: newPrompt });
    else if (isStart) updateBlock(activeBlockIndex, { startPrompt: newPrompt });
    else updateBlock(activeBlockIndex, { endPrompt: newPrompt });
  };

  const availableModels = MODELS.filter((m) => m.type === (isVideo ? "VIDEO" : "IMAGE"));
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const AVAILABLE_MODEL = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  useEffect(() => {
    setSelectedModel(availableModels[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!isVideo) setIsDragging(true);
    };
    
    window.addEventListener("dragover", handleDragOver);
    return () => window.removeEventListener("dragover", handleDragOver);
  }, [isVideo]);

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
        // Note: The UI currently polls in ProjectView, so we just set state locally
      },
      onError: (error) => {
        if (error.message?.toLowerCase().includes("credits")) {
          setShowCreditsModal(true);
        } else {
          toast.error(error.message || "Failed to start video generation", { duration: Infinity });
        }
        updateBlock(activeBlockIndex, { isGeneratingVideo: false });
      }
    })
  );

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      if (isVideo) {
        toast.info("Video generation started...");
        updateBlock(activeBlockIndex, { isGeneratingVideo: true });

        startVideoGeneration.mutateAsync({
          projectId,
          prompt,
          imageUrl: currentBlock.startFrameUrl || undefined,
          endImageUrl: currentBlock.endFrameUrl || undefined,
          model: selectedModel,
          blockIndex: activeBlockIndex
        }).then(() => {
          setIsGenerating(false);
        }).catch(() => {
          setIsGenerating(false);
        });

      } else {
        toast.info("Image generation started...");
        
        if (isStart) {
          updateBlock(activeBlockIndex, { isGeneratingStart: true });
        } else {
          updateBlock(activeBlockIndex, { isGeneratingEnd: true });
        }

        let res;
        if (uploadedImage) {
          const formData = new FormData();
          formData.append("prompt", prompt);
          formData.append("projectId", projectId);
          formData.append("model", selectedModel);
          formData.append("frameType", activeBlockTab);
          formData.append("blockIndex", activeBlockIndex.toString());
          formData.append("image", uploadedImage);
          res = await fetch("/api/generate-frames", {
            method: "POST",
            body: formData,
          });
        } else {
          res = await fetch("/api/generate-frames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prompt, 
              projectId, 
              model: selectedModel,
              frameType: activeBlockTab,
              blockIndex: activeBlockIndex
            }),
          });
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate frames");
        }

        const data = await res.json();
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        
        if (isStart) {
          const newHistory = [...(currentBlock.startFrameHistory || []), data.frameUrl];
          updateBlock(activeBlockIndex, { isGeneratingStart: false, startFrameUrl: data.frameUrl, startFrameHistory: newHistory });
        } else {
          const newHistory = [...(currentBlock.endFrameHistory || []), data.frameUrl];
          updateBlock(activeBlockIndex, { isGeneratingEnd: false, endFrameUrl: data.frameUrl, endFrameHistory: newHistory });
        }
        setUploadedImage(null);
        setIsGenerating(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message?.toLowerCase().includes("credits")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to generate", { duration: Infinity });
      }
      setIsGenerating(false);
      if (isStart) updateBlock(activeBlockIndex, { isGeneratingStart: false });
      if (isEnd) updateBlock(activeBlockIndex, { isGeneratingEnd: false });
      if (isVideo) updateBlock(activeBlockIndex, { isGeneratingVideo: false });
    }
  };

  return (
    <>
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      
      {isDragging && !isVideo && (
        <div 
          className="fixed inset-0 z-[9999] bg-[#000000]/90 flex flex-col items-center justify-center backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              if (file.type.startsWith("image/")) {
                setUploadedImage(file);
              }
            }
          }}
        >
          <div className="text-white text-base font-mono pointer-events-none flex flex-col items-center gap-4">
            <i className="ri-download-2-line text-2xl font-light" />
            <span className="tracking-wide">Drop your image</span>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-[#1C1C1C] relative p-4 space-y-4">
        <div className="flex-1" />
        <div className="flex items-center gap-2 bg-[#272725] p-1 rounded-[8px] mt-4">
          {activeBlockIndex === 0 && (
            <button
              onClick={() => onTabChange("START")}
              className={cn(
                "flex-1 text-center py-2 text-sm rounded-[6px] transition-colors",
                activeBlockTab === "START" ? "bg-[#3B3B3B] text-white" : "text-white/50 hover:text-white"
              )}
            >
              Start frame
            </button>
          )}
          <button
            onClick={() => onTabChange("END")}
            className={cn(
              "flex-1 text-center py-2 text-sm rounded-[6px] transition-colors",
              activeBlockTab === "END" ? "bg-[#3B3B3B] text-white" : "text-white/50 hover:text-white"
            )}
          >
            End frame
          </button>
          <button
            onClick={() => onTabChange("VIDEO")}
            className={cn(
              "flex-1 text-center py-2 text-sm rounded-[6px] transition-colors",
              activeBlockTab === "VIDEO" ? "bg-[#3B3B3B] text-white" : "text-white/50 hover:text-white"
            )}
          >
            Video
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-white text-sm font-inconsolata">Editing video {activeBlockIndex + 1}</span>
          <span className="text-white/30 text-xs font-mono">
            {activeBlockIndex === 0 ? 0 : 8 + (activeBlockIndex - 1) * 4}s - {activeBlockIndex === 0 ? 8 : 8 + activeBlockIndex * 4}s
          </span>
        </div>

        <div className="bg-[#272725] border border-[#282825] rounded-[8px] p-3 space-y-3 mt-4">
          {uploadedImage && (
            <div className="relative inline-block mt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(uploadedImage)} alt="Uploaded" className="h-16 w-16 object-cover rounded-[6px]" />
              <button 
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 bg-[#1c1c1c] text-white rounded-full w-5 h-5 flex items-center justify-center border border-[#3b3b3b] hover:bg-[#3b3b3b] transition-colors"
              >
                <i className="ri-close-line text-xs" />
              </button>
            </div>
          )}
          <TextareaAutosize
            value={prompt}
            onChange={handlePromptChange}
            placeholder={`Prompt to generate ${activeBlockTab.toLowerCase().replace('_', ' ')}`}
            minRows={3}
            maxRows={14}
            className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[80px]"
            disabled={isGenerating}
          />

          <div className="flex items-center gap-x-2">
            {!isVideo && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedImage(e.target.files[0]);
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 flex items-center justify-center rounded-full border-[0.5px] border-[#3B3B3B] text-[#CCCCCC] hover:text-white hover:bg-white/5 transition-colors"
                  title="Upload image"
                >
                  <i className="ri-add-line text-lg" />
                </button>
              </>
            )}
            <div className="relative" ref={dropdownRef}>
              <div
                className="h-8 px-2.5 flex items-center gap-1.5 rounded-full border-[0.5px] border-[#3B3B3B] text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setModelDropdownOpen((o) => !o)}
              >
                {AVAILABLE_MODEL?.emoji && <span className="text-sm">{AVAILABLE_MODEL.emoji}</span>}
                <span>{AVAILABLE_MODEL?.label}</span>
                <i className="ri-arrow-down-s-line mt-0.5 text-white" />
              </div>

              {modelDropdownOpen && (
                <div className="absolute bottom-10 left-0 z-50 bg-[#272725] border border-[#3B3B3B] rounded-[8px] overflow-hidden min-w-[180px] shadow-xl">
                  {availableModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm font-inconsolata transition-colors hover:bg-white/5",
                        selectedModel === model.id ? "text-white" : "text-[#CCCCCC]"
                      )}
                    >
                      <span>{model.label}</span>
                      {selectedModel === model.id && <i className="ri-check-line ml-auto text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 ml-auto">
              <div className="flex items-center gap-1 text-[#CCCCCC]">
                <i className="ri-sparkling-fill text-white text-sm" />
                <span className="text-sm font-medium">{AVAILABLE_MODEL?.credits}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={shouldShowSpinner || (!prompt.trim())}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
              >
                {shouldShowSpinner ? (
                  <i className="ri-loader-4-line animate-spin inline-block text-[#1C1C1C]" />
                ) : (
                  <i className="ri-arrow-right-line text-[#1C1C1C]" />
                )}
              </button>
            </div>
          </div>
        </div>



        <div className="space-y-3 mt-auto">
          <Button
            className="w-full rounded-[8px] bg-white text-black font-inconsolata text-sm h-9 hover:bg-[#e0e0e0] font-[500] disabled:bg-white/50"
            onClick={onProceed}
            disabled={isExtracting || !blocks.every((block) => !!block.videoUrl)}
          >
            {isExtracting ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2" />
                Extracting frames...
              </>
            ) : "Proceed"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-white/50 hover:text-white font-inconsolata"
            onClick={() => window.location.href = "/"}
          >
            Back to home
          </Button>
        </div>
      </div>
    </>
  );
};

