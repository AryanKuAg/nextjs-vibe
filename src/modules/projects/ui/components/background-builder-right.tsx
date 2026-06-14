"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

export type BlockTab = "START" | "END" | "VIDEO";

export interface VideoBlock {
  startPrompt?: string;
  endPrompt?: string;
  videoPrompt?: string;
  startFrameUrl: string | null;
  startFrameHistory?: string[];
  endFrameUrl: string | null;
  endFrameHistory?: string[];
  videoUrl: string | null;
  videoHistory?: string[];
  startUploadedImage?: File | null;
  endUploadedImage?: File | null;
  isGeneratingStart: boolean;
  isGeneratingEnd: boolean;
  isGeneratingVideo: boolean;
  generatingVideoModel?: string;
}

interface Props {
  blocks: VideoBlock[];
  activeBlockIndex: number;
  setActiveBlockIndex: (index: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (index: number) => void;
  updateBlock: (index: number, updates: Partial<VideoBlock>) => void;
}

import { useState, useRef, useEffect } from "react";

// ─── Fake progress hook ────────────────────────────────────────────────────────
function useGenerationProgress(isGenerating: boolean, type: "image" | "video" = "image", modelId?: string) {
  const [pct, setPct] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasGenerating = useRef(false);

  useEffect(() => {
    if (isGenerating) {
      wasGenerating.current = true;
      setPct(0);

      const updateIntervalMs = 500;
      // Fraction of remaining progress to consume per tick to roughly reach 95% at targetSeconds
      let baseFraction = type === "video" ? 0.015 : 0.05;

      if (modelId === "replicate-kling-v2.5-turbo-pro") {
        baseFraction = 0.003; // Kling takes ~3 mins, so slow it down significantly
      }

      intervalRef.current = setInterval(() => {
        setPct((prev) => {
          const remaining = 99 - prev;
          let fraction = baseFraction;

          const chance = Math.random();
          // 10% chance for a burst
          if (chance < 0.10) {
            fraction *= 4;
          }
          // 25% chance to stall/slow down
          else if (chance < 0.35) {
            fraction *= 0.1;
          }
          // Normal variance
          else {
            fraction *= (0.7 + Math.random() * 0.6);
          }

          // Always add at least a tiny bit so it never completely freezes
          const increment = Math.max(0.15, remaining * fraction);

          // If we hit 99, just creep infinitely by 0.01 so the underlying bar never technically stops
          if (prev + increment >= 99) {
            return Math.min(99.9, prev + 0.01);
          }

          return prev + increment;
        });
      }, updateIntervalMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Only flash 100% if we were actually generating — not on initial mount
      if (wasGenerating.current) {
        wasGenerating.current = false;
        setPct(100);
        const t = setTimeout(() => setPct(0), 600);
        return () => clearTimeout(t);
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isGenerating, type, modelId]);

  return pct;
}

// ─── Shimmer overlay shown while generating ────────────────────────────────────
function GenerationOverlay({ isGenerating, type = "image", modelId }: { isGenerating: boolean; type?: "image" | "video", modelId?: string }) {
  const pct = useGenerationProgress(isGenerating, type, modelId);
  if (!isGenerating && pct === 0) return null;
  return (
    <>
      <style>{`
        @keyframes blob-1 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          33%      { transform: translate(20%,  -15%) scale(1.15); }
          66%      { transform: translate(-10%, 20%)  scale(0.9);  }
        }
        @keyframes blob-2 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          33%      { transform: translate(-25%, 10%)  scale(1.1);  }
          66%      { transform: translate(15%, -20%)  scale(0.95); }
        }
        @keyframes blob-3 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          33%      { transform: translate(10%,  25%)  scale(0.9);  }
          66%      { transform: translate(-20%,-10%)  scale(1.2);  }
        }
        @keyframes blob-4 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          50%      { transform: translate(-15%, 15%)  scale(1.05); }
        }
        @keyframes blob-5 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          40%      { transform: translate(18%,  12%)  scale(1.1);  }
          70%      { transform: translate(-8%,  -18%) scale(0.88); }
        }
        @keyframes blob-6 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          35%      { transform: translate(-20%, -12%) scale(1.08); }
          65%      { transform: translate(12%,  18%)  scale(0.92); }
        }
        @keyframes blob-7 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          50%      { transform: translate(22%,  -8%)  scale(1.12); }
        }
        @keyframes blob-8 {
          0%,100% { transform: translate(0%,   0%)   scale(1);    }
          45%      { transform: translate(-15%, -15%) scale(1.15); }
        }
        .gen-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(36px);
          mix-blend-mode: screen;
        }
        .gen-blob-1 { width:75%; height:65%; top:-20%; left:-15%;  opacity:0.35; background:radial-gradient(circle, #b0b0b0 0%, transparent 70%); animation: blob-1  7s ease-in-out infinite; }
        .gen-blob-2 { width:60%; height:55%; top:35%;  left:38%;   opacity:0.28; background:radial-gradient(circle, #d4d4d4 0%, transparent 70%); animation: blob-2  9s ease-in-out infinite; }
        .gen-blob-3 { width:65%; height:60%; top:45%;  left:-10%;  opacity:0.30; background:radial-gradient(circle, #9a9a9a 0%, transparent 70%); animation: blob-3  8s ease-in-out infinite; }
        .gen-blob-4 { width:50%; height:45%; top:-15%; left:50%;   opacity:0.25; background:radial-gradient(circle, #c8c8c8 0%, transparent 70%); animation: blob-4 11s ease-in-out infinite; }
        .gen-blob-5 { width:55%; height:50%; top:15%;  left:25%;   opacity:0.22; background:radial-gradient(circle, #e0e0e0 0%, transparent 70%); animation: blob-5 10s ease-in-out infinite; }
        .gen-blob-6 { width:50%; height:55%; top:60%;  left:30%;   opacity:0.27; background:radial-gradient(circle, #acacac 0%, transparent 70%); animation: blob-6  6s ease-in-out infinite; }
        .gen-blob-7 { width:45%; height:40%; top:5%;   left:65%;   opacity:0.20; background:radial-gradient(circle, #bebebe 0%, transparent 70%); animation: blob-7 12s ease-in-out infinite; }
        .gen-blob-8 { width:65%; height:60%; top:50%;  left:50%;   opacity:0.35; background:radial-gradient(circle, #ffffff 0%, transparent 70%); animation: blob-8  9s ease-in-out infinite; }
      `}</style>
      {/* Dark base */}
      <div className="absolute inset-0 bg-[#111111]" />
      {/* Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="gen-blob gen-blob-1" />
        <div className="gen-blob gen-blob-2" />
        <div className="gen-blob gen-blob-3" />
        <div className="gen-blob gen-blob-4" />
        <div className="gen-blob gen-blob-5" />
        <div className="gen-blob gen-blob-6" />
        <div className="gen-blob gen-blob-7" />
        <div className="gen-blob gen-blob-8" />
      </div>
      {/* Percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
        <span className="text-white font-inconsolata text-sm tabular-nums">
          {Math.round(pct)}%
        </span>
        <div className="w-20 h-[2px] bg-[#333] rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );
}

export const BackgroundBuilderRight = ({
  blocks,
  activeBlockIndex,
  setActiveBlockIndex,
  onAddBlock,
  onRemoveBlock,
  updateBlock
}: Props) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [hoveredVideoIndex, setHoveredVideoIndex] = useState<number | null>(null);
  const [downloadingVideoIndex, setDownloadingVideoIndex] = useState<number | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const handleDownloadVideo = async (url: string, index: number) => {
    setDownloadingVideoIndex(index);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `video-${index + 1}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Video download failed", e);
    } finally {
      setDownloadingVideoIndex(null);
    }
  };

  const handleNavigate = (type: "START" | "END" | "VIDEO", direction: number, block: VideoBlock, index: number) => {
    if (type === "START" && block.startFrameHistory) {
      const history = Array.from(new Set(block.startFrameHistory));
      const currentIdx = history.indexOf(block.startFrameUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + history.length) % history.length;
        updateBlock(index, { startFrameUrl: history[newIdx] });
      }
    }
    if (type === "END" && block.endFrameHistory) {
      const history = Array.from(new Set(block.endFrameHistory));
      const currentIdx = history.indexOf(block.endFrameUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + history.length) % history.length;
        updateBlock(index, { endFrameUrl: history[newIdx] });
      }
    }
    if (type === "VIDEO" && block.videoHistory) {
      const history = Array.from(new Set(block.videoHistory));
      const currentIdx = history.indexOf(block.videoUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + history.length) % history.length;
        updateBlock(index, {
          videoUrl: history[newIdx]
        });
      }
    }
  };


  const handleDownload = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Failed to download image", e);
    }
  };

  const handleFullscreen = (e: React.MouseEvent, url: string) => {
    setFullscreenImage(url);
  };

  const renderHistoryIndicator = (type: "START" | "END" | "VIDEO", url: string | null, rawHistory?: string[], block?: VideoBlock, index?: number) => {
    if (!url || !rawHistory || rawHistory.length <= 1 || !block || index === undefined) return null;
    if (type === "START" && index > 0) return null; // Hide history for inherited start frames

    const history = Array.from(new Set(rawHistory));
    if (history.length <= 1) return null; // Don't show if there are no alternatives

    const idx = history.indexOf(url);
    if (idx === -1) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigate(type, -1, block, index); }}
          disabled={history.length <= 1}
          className="text-[#666] hover:text-white disabled:opacity-50 transition-colors"
        >
          <i className="ri-arrow-left-s-line" />
        </button>
        <span className="text-[#666] text-xs font-mono">{idx + 1}/{history.length}</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleNavigate(type, 1, block, index); }}
          disabled={history.length <= 1}
          className="text-[#666] hover:text-white disabled:opacity-50 transition-colors"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      </div>
    );
  };

  const renderBlock = (block: VideoBlock, index: number) => {
    const title = `Video ${index + 1}`;
    const startTime = index * 4;
    const endTime = startTime + 4;
    const duration = `${startTime}s - ${endTime}s`;
    const isActive = index === activeBlockIndex;
    const isLocked = index > 0 && !blocks[index - 1].videoUrl;
    const showRemove = index > 0 && index === blocks.length - 1;

    return (
      <div
        key={index}
        className={cn(
          "flex flex-col mb-6 max-w-4xl mx-auto w-full transition-opacity duration-200",
          isLocked ? "opacity-40" : !isActive ? "cursor-pointer" : ""
        )}
        onClick={() => !isLocked && setActiveBlockIndex(index)}
      >
        {index > 0 && (
          <div className="flex justify-center mb-6">
            <Image src="/arrow.svg" alt="arrow" width={12} height={12} className="opacity-70 rotate-90" />
          </div>
        )}
        <div className={cn(
          "bg-[#282828] rounded-[16px] transition-colors max-w-[640px] mx-auto w-full overflow-hidden",
          blocks.length > 1 && (isActive ? "border border-white" : "border border-transparent hover:bg-[#2c2c2c]")
        )}>
          <div className="flex items-center justify-between p-3 border-b border-[#333333]">
            <h3 className="text-white text-sm font-inconsolata">{title}</h3>
            <div className="flex items-center gap-4">
              <span className="text-[#737373] text-sm font-mono">{duration}</span>
              {showRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBlock(index);
                  }}
                  className="text-[#666] hover:text-white transition-colors"
                  title="Remove video box"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 pt-3">
            <div className="grid grid-cols-2 gap-3 mb-3 ">
              {/* Start Frame */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-inconsolata">Start frame</span>
                  {renderHistoryIndicator("START", block.startFrameUrl, block.startFrameHistory, block, index)}
                </div>
                <div className="aspect-video bg-transparent rounded-[8px] flex items-center justify-center border border-[#333333] overflow-hidden relative">
                  <GenerationOverlay isGenerating={block.isGeneratingStart} />
                  {!block.isGeneratingStart && block.startFrameUrl ? (
                    <div className="relative w-full h-full group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.startFrameUrl} alt="Start frame" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(block.startFrameUrl!, `start-frame-${index + 1}.png`); }}
                          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                          title="Download image"
                        >
                          <i className="ri-download-2-line text-sm" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFullscreen(e, block.startFrameUrl!); }}
                          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                          title="View Fullscreen"
                        >
                          <i className="ri-fullscreen-line text-sm" />
                        </button>
                      </div>
                    </div>
                  ) : !block.isGeneratingStart ? (
                    <span className="text-[#ccc] text-sm font-inconsolata">
                      {index > 0 ? (
                        `Last frame of video ${index} will appear here`
                      ) : "Prompt to generate"}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* End Frame */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-inconsolata">End frame (Optional)</span>
                  {renderHistoryIndicator("END", block.endFrameUrl, block.endFrameHistory, block, index)}
                </div>
                <div className="aspect-video bg-transparent rounded-[8px] flex items-center justify-center border border-[#333333] overflow-hidden relative">
                  <GenerationOverlay isGenerating={block.isGeneratingEnd} />
                  {!block.isGeneratingEnd && block.endFrameUrl ? (
                    <div className="relative w-full h-full group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.endFrameUrl} alt="End frame" className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(block.endFrameUrl!, `end-frame-${index + 1}.png`); }}
                          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                          title="Download image"
                        >
                          <i className="ri-download-2-line text-sm" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFullscreen(e, block.endFrameUrl!); }}
                          className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 backdrop-blur-sm transition-colors"
                          title="View Fullscreen"
                        >
                          <i className="ri-fullscreen-line text-sm" />
                        </button>
                      </div>
                    </div>
                  ) : !block.isGeneratingEnd ? (
                    <span className="text-[#ccc] text-sm font-inconsolata">Prompt to generate</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Video */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-inconsolata">Video</span>
                {renderHistoryIndicator("VIDEO", block.videoUrl, block.videoHistory, block, index)}
              </div>
              <div
                className="aspect-video bg-background rounded-[8px] flex items-center justify-center border border-[#282825] overflow-hidden relative group"
                onMouseEnter={() => {
                  setHoveredVideoIndex(index);
                  if (block.videoUrl) {
                    const v = videoRefs.current[index];
                    if (v) {
                      const playPromise = v.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(() => {
                          // Ignore auto-play interruption errors
                        });
                      }
                    }
                  }
                }}
                onMouseLeave={() => {
                  setHoveredVideoIndex(null);
                  if (block.videoUrl) {
                    const v = videoRefs.current[index];
                    if (v) { v.pause(); }
                  }
                }}
              >
                {block.isGeneratingVideo ? (
                  <GenerationOverlay isGenerating={block.isGeneratingVideo} type="video" modelId={block.generatingVideoModel} />
                ) : block.videoUrl ? (
                  <>
                    <video
                      ref={(el) => { videoRefs.current[index] = el; }}
                      src={block.videoUrl}
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay buttons */}
                    <div className={cn(
                      "absolute top-2 right-2 flex items-center gap-1.5 transition-opacity duration-150",
                      hoveredVideoIndex === index ? "opacity-100" : "opacity-0"
                    )}>
                      {/* Download */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownloadVideo(block.videoUrl!, index); }}
                        disabled={downloadingVideoIndex === index}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
                        title="Download video"
                      >
                        {downloadingVideoIndex === index
                          ? <i className="ri-loader-4-line text-sm animate-spin" />
                          : <i className="ri-download-2-line text-sm" />
                        }
                      </button>
                      {/* Fullscreen */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); videoRefs.current[index]?.requestFullscreen?.(); }}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                        title="Fullscreen"
                      >
                        <i className="ri-fullscreen-line text-sm" />
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-[#ccc] text-sm font-inconsolata">Preview your generated video here</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-background overflow-y-auto custom-scrollbar relative p-8">

      {/* Top Toggle */}


      {/* Blocks Container */}
      <div className="flex flex-col pb-20 w-full max-w-4xl mx-auto px-4">
        {blocks.map((block, idx) => renderBlock(block, idx))}

        {blocks.length < 4 && (
          <button
            onClick={onAddBlock}
            disabled={!blocks[blocks.length - 1]?.videoUrl}
            className={cn(
              "w-full rounded-[8px] border border-[#2c2c2c] bg-transparent text-white text-sm font-inconsolata transition-colors h-[32px] max-w-[640px] mx-auto",
              !blocks[blocks.length - 1]?.videoUrl
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#282828]"
            )}
          >
            Add another video
          </button>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors bg-black/40 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-md"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <i className="ri-close-line text-2xl" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage}
            alt="Fullscreen preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
