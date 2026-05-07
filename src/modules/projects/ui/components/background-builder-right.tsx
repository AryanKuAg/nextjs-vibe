"use client";

import { cn } from "@/lib/utils";

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
}

interface Props {
  blocks: VideoBlock[];
  activeBlockIndex: number;
  setActiveBlockIndex: (index: number) => void;
  onAddBlock: () => void;
  onRemoveBlock: (index: number) => void;
  updateBlock: (index: number, updates: Partial<VideoBlock>) => void;
}

import { useState, useRef } from "react";

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
          "flex flex-col mb-12 max-w-4xl mx-auto w-full transition-opacity duration-200",
          isLocked ? "opacity-40" : !isActive ? "cursor-pointer" : ""
        )}
        onClick={() => !isLocked && setActiveBlockIndex(index)}
      >
        {index > 0 && (
          <div className="flex justify-center mb-2">
            <span className="text-[#666666] text-xs font-mono">↓</span>
          </div>
        )}
        <div className={cn(
          "bg-[#272725] rounded-xl p-4 border transition-colors",
          isActive ? "border-[#444]" : "border-transparent opacity-80"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-sm font-inconsolata">{title}</h3>
            <div className="flex items-center gap-4">
              <span className="text-[#666] text-xs font-mono">{duration}</span>
              {showRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBlock(index);
                  }}
                  className="text-[#666] hover:text-red-400 transition-colors"
                  title="Remove video box"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Start Frame */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[#999] text-xs font-inconsolata">Start frame</span>
                {renderHistoryIndicator("START", block.startFrameUrl, block.startFrameHistory, block, index)}
              </div>
              <div className="aspect-video bg-[#1C1C1C] rounded-[8px] flex items-center justify-center border border-[#282825] overflow-hidden relative">
                {block.isGeneratingStart ? (
                  <i className="ri-loader-4-line text-[#666] text-2xl animate-spin" />
                ) : block.startFrameUrl ? (
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
                ) : (
                  <span className="text-[#666] text-xs font-inconsolata">
                    {index > 0 ? (
                      `Last frame of video ${index} will appear here`
                    ) : "Prompt to generate"}
                  </span>
                )}
              </div>
            </div>

            {/* End Frame */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[#999] text-xs font-inconsolata">End frame</span>
                {renderHistoryIndicator("END", block.endFrameUrl, block.endFrameHistory, block, index)}
              </div>
              <div className="aspect-video bg-[#1C1C1C] rounded-[8px] flex items-center justify-center border border-[#282825] overflow-hidden relative">
                {block.isGeneratingEnd ? (
                  <i className="ri-loader-4-line text-[#666] text-2xl animate-spin" />
                ) : block.endFrameUrl ? (
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
                ) : (
                  <span className="text-[#666] text-xs font-inconsolata">Prompt to generate</span>
                )}
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#999] text-xs font-inconsolata">Video</span>
              {renderHistoryIndicator("VIDEO", block.videoUrl, block.videoHistory, block, index)}
            </div>
            <div
              className="aspect-video bg-[#1C1C1C] rounded-[8px] flex items-center justify-center border border-[#282825] overflow-hidden relative group"
              onMouseEnter={() => {
                setHoveredVideoIndex(index);
                if (block.videoUrl) videoRefs.current[index]?.play();
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
                <i className="ri-loader-4-line text-[#666] text-2xl animate-spin" />
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
                <span className="text-[#666] text-xs font-inconsolata">Preview your generated video here</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#1C1C1C] overflow-y-auto custom-scrollbar relative p-8">

      {/* Top Toggle */}


      {/* Blocks Container */}
      <div className="flex flex-col pb-20 w-full max-w-4xl mx-auto px-4">
        {blocks.map((block, idx) => renderBlock(block, idx))}

        {blocks.length < 4 && (
          <button
            onClick={onAddBlock}
            disabled={!blocks[blocks.length - 1]?.videoUrl}
            className={cn(
              "w-full py-4 mt-2 rounded-[12px] border border-[#282825] bg-transparent text-[#999] text-sm font-inconsolata transition-colors",
              !blocks[blocks.length - 1]?.videoUrl
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/5"
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
