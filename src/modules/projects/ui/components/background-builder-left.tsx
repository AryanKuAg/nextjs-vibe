"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

const openImagesDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vibe-images-db", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveImageToIDB = async (key: string, file: File) => {
  try {
    const db = await openImagesDB();
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").put(file, key);
  } catch (err) {
    console.error("Failed to save image to IDB:", err);
  }
};

const loadImageFromIDB = async (key: string): Promise<File | null> => {
  try {
    const db = await openImagesDB();
    return new Promise((resolve) => {
      const tx = db.transaction("images", "readonly");
      const req = tx.objectStore("images").get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const deleteImageFromIDB = async (key: string) => {
  try {
    const db = await openImagesDB();
    const tx = db.transaction("images", "readwrite");
    tx.objectStore("images").delete(key);
  } catch {
    // ignore
  }
};

const MODELS = [
  { id: "gemini-3.1-flash-image-preview", label: "Nano Banana 2", emoji: "🍌", credits: 7, type: "IMAGE" },
  { id: "gemini-3-pro-image-preview", label: "Nano Banana Pro", emoji: "🍌", credits: 14, type: "IMAGE" },
  { id: "veo-3.1-lite-generate-001", label: "Veo 3.1 Lite", emoji: "", credits: 12, type: "VIDEO" },
  { id: "veo-3.1-fast-generate-001", label: "Veo 3.1 Fast", emoji: "", credits: 32, type: "VIDEO" },
  { id: "veo-3.1-generate-001", label: "Veo 3.1 Quality", emoji: "", credits: 80, type: "VIDEO" },
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

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isVideo = activeBlockTab === "VIDEO";
  const isStart = activeBlockTab === "START";
  const isEnd = activeBlockTab === "END";

  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const currentBlock = blocks[activeBlockIndex] || {};

  const isCurrentTabGenerating =
    (isStart && currentBlock.isGeneratingStart) ||
    (isEnd && currentBlock.isGeneratingEnd) ||
    (isVideo && currentBlock.isGeneratingVideo);

  const shouldShowSpinner = isGenerating || isCurrentTabGenerating;

  const prompt = isVideo ? (currentBlock.videoPrompt || "") : isStart ? (currentBlock.startPrompt || "") : (currentBlock.endPrompt || "");
  const uploadedImage = isStart ? currentBlock.startUploadedImage : isEnd ? currentBlock.endUploadedImage : null;
  const imageKey = `project-${projectId}-block-${activeBlockIndex}-${isStart ? 'start' : 'end'}`;

  useEffect(() => {
    if (!isVideo && !uploadedImage) {
      loadImageFromIDB(imageKey).then(file => {
        if (file) {
          updateBlock(activeBlockIndex, {
            [isStart ? "startUploadedImage" : "endUploadedImage"]: file
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlockIndex, isStart, isEnd, isVideo, imageKey]);

  const setUploadedImage = (file: File | null) => {
    updateBlock(activeBlockIndex, {
      [isStart ? "startUploadedImage" : "endUploadedImage"]: file || undefined
    });
    if (file) {
      saveImageToIDB(imageKey, file);
    } else {
      deleteImageFromIDB(imageKey);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement> | string) => {
    const newPrompt = typeof e === 'string' ? e : e.target.value;
    if (isVideo) {
      updateBlock(activeBlockIndex, { videoPrompt: newPrompt });
    } else if (isStart) {
      updateBlock(activeBlockIndex, { startPrompt: newPrompt });
    } else {
      updateBlock(activeBlockIndex, { endPrompt: newPrompt });
    }
  };

  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          type: "video",
          startFrameUrl: currentBlock.startFrameUrl,
          endFrameUrl: currentBlock.endFrameUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.prompt) {
        handlePromptChange(data.prompt);
        toast.success("Prompt enhanced successfully!");
      } else {
        toast.error("Failed to enhance prompt: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while enhancing prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  const availableModels = MODELS.filter((m) => m.type === (isVideo ? "VIDEO" : "IMAGE"));
  const [selectedModel, setSelectedModel] = useState(availableModels[0].id);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSubmitted = useRef(false);

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

  // Auto-submit when redirected from the home page with ?autoSubmit=true
  // We wait until the prompt has been hydrated from DB into the block state
  useEffect(() => {
    const autoSubmit = searchParams.get("autoSubmit") === "true";
    if (!autoSubmit || hasAutoSubmitted.current || isGenerating) return;

    // prompt is derived from currentBlock, which gets populated from DB via ProjectView.
    // Only fire once the prompt is actually available.
    const currentPrompt = blocks[0]?.startPrompt || "";
    if (!currentPrompt.trim()) return;

    hasAutoSubmitted.current = true;

    // Restore any pending uploaded image from sessionStorage (saved by project-form)
    const pendingImageBase64 = sessionStorage.getItem("pending_image_base64");
    const pendingImageName = sessionStorage.getItem("pending_image_name");
    const pendingImageType = sessionStorage.getItem("pending_image_type");

    const runAutoSubmit = async (imageFile?: File) => {
      if (imageFile) {
        updateBlock(0, { startUploadedImage: imageFile });
        await saveImageToIDB(`project-${projectId}-block-0-start`, imageFile);
      }
      // Restore model selected on the landing page
      const pendingModel = sessionStorage.getItem("pending_model");
      if (pendingModel) {
        setSelectedModel(pendingModel);
        sessionStorage.removeItem("pending_model");
      }
      // Clean up URL so refreshing doesn't re-trigger
      const params = new URLSearchParams(searchParams.toString());
      params.delete("autoSubmit");
      const newUrl = `${pathname}${params.toString() ? `?${params}` : ""}`;
      router.replace(newUrl);
      // Trigger start-frame generation with the pending model (bypasses state flush timing)
      handleSubmit(pendingModel ?? undefined);
    };

    if (pendingImageBase64 && pendingImageName && pendingImageType) {
      fetch(pendingImageBase64)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], pendingImageName, { type: pendingImageType });
          sessionStorage.removeItem("pending_image_base64");
          sessionStorage.removeItem("pending_image_name");
          sessionStorage.removeItem("pending_image_type");
          return runAutoSubmit(file);
        })
        .catch(() => runAutoSubmit());
    } else {
      runAutoSubmit();
    }
    // We intentionally depend on blocks[0]?.startPrompt so the effect
    // re-runs when the DB data arrives after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks[0]?.startPrompt, searchParams]);

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

  const handleSubmit = async (modelOverride?: string) => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const effectiveModel = modelOverride || selectedModel;

    try {
      if (isVideo) {
        if (!currentBlock.endFrameUrl) {
          toast.error("Please generate an end frame first.");
          setIsGenerating(false);
          return;
        }

        toast.info("Video generation started...");
        updateBlock(activeBlockIndex, { isGeneratingVideo: true });

        startVideoGeneration.mutateAsync({
          projectId,
          prompt,
          imageUrl: currentBlock.startFrameUrl || undefined,
          endImageUrl: currentBlock.endFrameUrl || undefined,
          model: effectiveModel,
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
          formData.append("model", effectiveModel);
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
              model: effectiveModel,
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
          onTabChange("END");
        } else {
          const newHistory = [...(currentBlock.endFrameHistory || []), data.frameUrl];
          updateBlock(activeBlockIndex, { isGeneratingEnd: false, endFrameUrl: data.frameUrl, endFrameHistory: newHistory });
          onTabChange("VIDEO");
        }
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

      <div className="flex flex-col h-full bg-background relative p-3 ">
        <div className="flex-1" />
        <div className="flex items-center gap-2 rounded-[8px] mt-4 text-sm">
          {activeBlockIndex === 0 && (
            <button
              onClick={() => onTabChange("START")}
              className={cn(
                "flex-1 text-center py-2 text-sm rounded-[8px] transition-all h-[32px] border flex items-center justify-center",
                activeBlockTab === "START"
                  ? "bg-[#282828] text-white border-[#282828]"
                  : "text-white border-[#2C2C2C] hover:bg-[#282828]"
              )}
            >
              Start frame
            </button>
          )}
          <button
            onClick={() => onTabChange("END")}
            className={cn(
              "flex-1 text-center py-2 text-sm rounded-[8px] transition-all h-[32px] border flex items-center justify-center",
              activeBlockTab === "END"
                ? "bg-[#282828] text-white border-[#282828]"
                : "text-white border-[#2C2C2C] hover:bg-[#282828]"
            )}
          >
            End frame
          </button>
          <button
            onClick={() => onTabChange("VIDEO")}
            className={cn(
              "flex-1 text-center py-2 text-sm rounded-[8px] transition-all h-[32px] border flex items-center justify-center",
              activeBlockTab === "VIDEO"
                ? "bg-[#282828] text-white border-[#282828]"
                : "text-white border-[#2C2C2C] hover:bg-[#282828]"
            )}
          >
            Video
          </button>
        </div>

        <div className="bg-[#282828] border-t border-r border-l border-b-0 border-[#2c2c2c] rounded-[16px] my-3">
          <div className="flex items-center justify-between px-3 pt-2 pb-2 border-b-0 border-[#282825]">
            <span className="text-white text-sm font-inconsolata">Editing video {activeBlockIndex + 1}</span>
            <span className="text-white/30 text-xs font-mono">
              {activeBlockIndex * 4}s - {(activeBlockIndex + 1) * 4}s
            </span>
          </div>

          <div className="p-3 space-y-3  border-t border-[#2c2c2c] rounded-[16px]">

            {uploadedImage && (
              <div className="relative inline-block mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(uploadedImage)} alt="Uploaded" className="h-16 w-16 object-cover rounded-[6px]" />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 bg-background text-white rounded-full w-5 h-5 flex items-center justify-center border border-[#3b3b3b] hover:bg-[#3b3b3b] transition-colors"
                >
                  <i className="ri-close-line text-xs" />
                </button>
              </div>
            )}
            <TextareaAutosize
              value={prompt}
              onChange={handlePromptChange}
              onPaste={(e) => {
                if (isVideo) return;
                const items = e.clipboardData?.items;
                if (items) {
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                      const file = items[i].getAsFile();
                      if (file) {
                        setUploadedImage(file);
                        e.preventDefault();
                        break;
                      }
                    }
                  }
                }
              }}
              placeholder={{ START: "Prompt to generate start frame", END: "Prompt to generate end frame", VIDEO: "Prompt to generate video" }[activeBlockTab]}
              minRows={2}
              maxRows={12}
              className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[35px]"
              disabled={isGenerating}
            />

            <div className="flex items-center gap-x-1">
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
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-[#333333] text-white  transition-colors"
                    title="Upload image"
                  >
                    <i className="ri-add-line text-lg" />
                  </button>
                </>
              )}
              <div className="relative" ref={dropdownRef}>
                <div
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-full border border-[#333333] text-sm text-white  transition-colors cursor-pointer"
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

              {isVideo && (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className="h-8 px-2 flex items-center justify-center rounded-full border-[0.5px] border-[#3B3B3B] text-[#CCCCCC] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                  title="Magic Wand - Enhance Prompt"
                >
                  {isEnhancing ? (
                    <i className="ri-loader-4-line animate-spin text-[15px]" />
                  ) : (
                    <i className="ri-magic-line text-[15px]" />
                  )}
                </button>
              )}

              <div className="flex gap-2 ml-auto">
                <div className="flex items-center gap-1 text-white">
                  <i className="ri-sparkling-2-fill text-white text-sm" />
                  <span className="text-sm font-medium">{AVAILABLE_MODEL?.credits}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
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
        </div>



        <div className="space-y-3 mt-auto">
          <Button
            className="w-full rounded-[8px] bg-white text-black font-inconsolata text-sm h-8 hover:bg-[#e0e0e0] font-[500] disabled:bg-white/50"
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
            className="w-full text-white font-inconsolata h-8 border border-[2c2c2c] hover:bg-[#282828]!"
            onClick={() => window.location.href = "/"}
          >
            Back to home
          </Button>
        </div>
      </div>
    </>
  );
};

