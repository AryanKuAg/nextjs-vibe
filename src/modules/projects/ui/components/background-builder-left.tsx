"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { MODEL_COSTS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { toast } from "sonner";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { cn } from "@/lib/utils";

import { useTRPC } from "@/trpc/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { TemplatesModal } from "@/components/templates-modal";

import { VideoBlock } from "./background-builder-right";

type BlockTab = "START" | "END" | "VIDEO";

interface Props {
  activeBlockIndex: number;
  activeBlockTab: BlockTab;
  onTabChange: (tab: BlockTab) => void;
  onProceed: () => void;
  onSkip?: () => void;
  updateBlock: (index: number, updates: Partial<VideoBlock>) => void;
  onApplyTemplate?: (blocks: VideoBlock[]) => void;
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
  { id: "google/nano-banana-2-lite", label: "Nano Banana 2", emoji: "", type: "IMAGE", time: "~20 sec" },
  { id: "bytedance/seedance-1.5-pro", label: "Seedance 1.5 Pro", emoji: "", type: "VIDEO", time: "~2 min" },
].map((m) => ({ ...m, credits: MODEL_COSTS[m.id] ?? 0 }));

export const BackgroundBuilderLeft = ({
  activeBlockIndex,
  activeBlockTab,
  onTabChange,
  onProceed,
  onSkip,
  updateBlock,
  onApplyTemplate,
  projectId,
  blocks,
  isExtracting
}: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  const availableModels = MODELS.filter((m) => m.type === (isVideo ? "VIDEO" : "IMAGE"));
  const [selectedModel, setSelectedModel] = useState(availableModels[0]?.id || "");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSubmitted = useRef(false);

  const AVAILABLE_MODEL = isVideo 
    ? { id: "bytedance/seedance-1.5-pro", label: "Seedance 1.5 Pro", emoji: "", type: "VIDEO", time: "~2 min", credits: 10 }
    : (availableModels.find(m => m.id === selectedModel) || availableModels[0]);

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
    const effectiveModel = isVideo ? "bytedance/seedance-1.5-pro" : (modelOverride || selectedModel);

    try {
      if (isVideo) {
        toast.info("Video generation started...");
        updateBlock(activeBlockIndex, { isGeneratingVideo: true, generatingVideoModel: effectiveModel });

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



  const getModelMargin = (modelId: string) => {
    if (modelId === "google/nano-banana-2-lite") return "pb-2";
    return "";
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
                  ? "bg-[#212121] text-white border-[#212121]"
                  : "text-white border-[#212121] hover:bg-[#212121]"
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
                ? "bg-[#212121] text-white border-[#212121]"
                : "text-white border-[#212121] hover:bg-[#212121]"
            )}
          >
            End frame
          </button>
          <button
            onClick={() => onTabChange("VIDEO")}
            className={cn(
              "flex-1 text-center py-2 text-sm rounded-[8px] transition-all h-[32px] border flex items-center justify-center",
              activeBlockTab === "VIDEO"
                ? "bg-[#212121] text-white border-[#212121]"
                : "text-white border-[#212121] hover:bg-[#212121]"
            )}
          >
            Video
          </button>
        </div>

        <div className="bg-[#212121] border-t border-r border-l border-b-0 border-[#2c2c2c] rounded-[16px] my-3">
          <div className="flex items-center justify-between px-3 pt-2 pb-2 border-b-0 border-[#282825]">
            <span className="text-white text-sm font-onest">Editing video {activeBlockIndex + 1}</span>
            <span className="text-white/30 text-sm">
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
                  className="absolute -top-2 -right-2 bg-background text-white rounded-full w-5 h-5 flex items-center justify-center border border-[#2c2c2c] hover:bg-[#3b3b3b] transition-colors"
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
                  {/* <Hint text="Add photo" side="top" align="start"> */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-white hover:bg-white/4  transition-colors"
                  >
                    <i className="ri-add-line text-base" />
                  </button>
                  {/* </Hint> */}
                </>
              )}
              {!isVideo && (
                <div className="relative" ref={dropdownRef}>
                  <div
                    className="h-8 px-2.5 flex items-center gap-1.5 rounded-full hover:bg-white/4 text-sm text-white transition-colors cursor-pointer whitespace-nowrap"
                    onClick={() => setModelDropdownOpen((o) => !o)}
                  >
                    {AVAILABLE_MODEL?.emoji && <span className="text-sm">{AVAILABLE_MODEL.emoji}</span>}
                    <span className="whitespace-nowrap">{AVAILABLE_MODEL?.label}</span>
                    <i className="ri-arrow-down-s-line mt-0.5 text-white text-base" />
                  </div>

                  {modelDropdownOpen && (
                    <div className="absolute bottom-10 left-0 z-50 bg-[#212121] border border-[#2c2c2c] rounded-[16px] min-w-[240px] shadow-3xl flex flex-col overflow-hidden">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                          className={cn("w-full flex items-center justify-between  p-3  transition-colors hover:bg-white/5 text-left group", getModelMargin(model.id))}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm  tracking-tight text-white leading-5 mb-0.5">{model.label}</span>
                            <span className="text-xs leading-[18px]  text-[#737373]">
                              {model.time} · {model.credits} credits
                            </span>
                          </div>
                          {selectedModel === model.id && <i className="ri-check-line text-[20px] text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* {isVideo && (
                <Hint text="Generate prompt" side="top">
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing}
                  className="h-8 px-2 flex items-center justify-center rounded-full text-white hover:bg-white/4 transition-colors disabled:opacity-50"
                >
                  {isEnhancing ? (
                    <i className="ri-loader-4-line animate-spin text-base" />
                  ) : (
                    <i className="ri-magic-line text-base" />
                  )}
                </button>
                 </Hint>
              )} */}

              <div className="flex gap-2 ml-auto">
                <div className="flex items-center gap-1 text-white">
                  <i className="ri-sparkling-2-fill text-white text-sm" />
                  <span className="text-sm font-medium">{AVAILABLE_MODEL?.credits}</span>
                </div>
                {shouldShowSpinner || !prompt.trim() ? (
                  <button
                    type="button"
                    disabled
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] transition-all shadow-sm"
                  >
                    {shouldShowSpinner ? (
                      <i className="ri-loader-4-line animate-spin inline-block text-[#1C1C1C]" />
                    ) : (
                      <i className="ri-arrow-right-line text-[#1C1C1C]" />
                    )}
                  </button>
                ) : (
                  <Hint text="Generate" side="top">
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
                    >
                      <i className="ri-arrow-right-line text-[#1C1C1C]" />
                    </button>
                  </Hint>
                )}
              </div>
            </div>
          </div>
        </div>



        <div className="space-y-3 mt-auto">
          <Button
            className="w-full rounded-[8px] bg-white text-black font-onest text-sm h-8 hover:bg-[#e0e0e0] font-[500] disabled:bg-white/50"
            onClick={onProceed}
            disabled={isExtracting || (!blocks.every((block) => !!block.videoUrl) && !blocks.some(block => !!block.builderPrompt))}
          >
            {isExtracting ? (
              <>
                <i className="ri-loader-4-line animate-spin" />
                Extracting frames...
              </>
            ) : "Proceed"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="rounded-[8px] flex-1 text-white font-onest h-8 border border-[#212121] hover:bg-[#212121]!"
              onClick={onSkip}
            >
              Skip
            </Button>
            <Button
              variant="ghost"
              className="rounded-[8px] flex-1 text-white font-onest h-8 border border-[#212121] hover:bg-[#212121]!"
              onClick={() => setIsTemplatesModalOpen(true)}
            >
              Templates
            </Button>
          </div>
        </div>
      </div>

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelect={(t) => {
          if (onApplyTemplate) {
            onApplyTemplate(t.blocks);
          }
        }}
      />
    </>
  );
};

