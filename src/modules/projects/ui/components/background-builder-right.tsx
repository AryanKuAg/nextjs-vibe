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

export const BackgroundBuilderRight = ({
  blocks,
  activeBlockIndex,
  setActiveBlockIndex,
  onAddBlock,
  onRemoveBlock,
  updateBlock
}: Props) => {

  const handleNavigate = (type: "START" | "END" | "VIDEO", direction: number, block: VideoBlock, index: number) => {
    if (type === "START" && block.startFrameHistory) {
      const currentIdx = block.startFrameHistory.indexOf(block.startFrameUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + block.startFrameHistory.length) % block.startFrameHistory.length;
        updateBlock(index, { startFrameUrl: block.startFrameHistory[newIdx] });
      }
    }
    if (type === "END" && block.endFrameHistory) {
      const currentIdx = block.endFrameHistory.indexOf(block.endFrameUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + block.endFrameHistory.length) % block.endFrameHistory.length;
        updateBlock(index, { endFrameUrl: block.endFrameHistory[newIdx] });
      }
    }
    if (type === "VIDEO" && block.videoHistory) {
      const currentIdx = block.videoHistory.indexOf(block.videoUrl || "");
      if (currentIdx !== -1) {
        const newIdx = (currentIdx + direction + block.videoHistory.length) % block.videoHistory.length;
        updateBlock(index, { videoUrl: block.videoHistory[newIdx] });
      }
    }
  };

  const renderHistoryIndicator = (type: "START" | "END" | "VIDEO", url: string | null, history?: string[], block?: VideoBlock, index?: number) => {
    if (!url || !history || history.length === 0 || !block || index === undefined) return null;
    const idx = history.indexOf(url);
    if (idx === -1) return <span className="text-[#666] text-xs font-mono">1/1</span>;
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
    const startTime = index === 0 ? 0 : 8 + (index - 1) * 4;
    const endTime = index === 0 ? 8 : startTime + 4;
    const duration = `${startTime}s - ${endTime}s`;
    const isActive = index === activeBlockIndex;
    const showRemove = index > 0 && index === blocks.length - 1;

    return (
      <div
        key={index}
        className="flex flex-col mb-12 max-w-4xl mx-auto w-full"
        onClick={() => setActiveBlockIndex(index)}
      >
        {index > 0 && (
          <div className="flex justify-center mb-2">
            <span className="text-[#666666] text-xs font-mono">↓</span>
          </div>
        )}
        <div className={cn(
          "bg-[#272725] rounded-xl p-4 border transition-colors",
          isActive ? "border-[#444]" : "opacity-80"
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.startFrameUrl} alt="Start frame" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#666] text-xs font-inconsolata">
                    {index > 0 ? `Last frame of video ${index} will appear here` : "Prompt to generate"}
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={block.endFrameUrl} alt="End frame" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#666] text-xs font-inconsolata">Prompt to generate (Optional)</span>
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
            <div className="aspect-video bg-[#1C1C1C] rounded-[8px] flex items-center justify-center border border-[#282825] overflow-hidden relative">
              {block.isGeneratingVideo ? (
                <i className="ri-loader-4-line text-[#666] text-2xl animate-spin" />
              ) : block.videoUrl ? (
                <video src={block.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
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
            className="w-full py-4 mt-2 rounded-[12px] border border-[#282825] bg-transparent hover:bg-white/5 text-[#999] text-sm font-inconsolata transition-colors"
          >
            Add another video
          </button>
        )}
      </div>

    </div>
  );
};
