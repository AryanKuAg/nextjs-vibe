import { Fragment } from "react";
import { cn } from "@/lib/utils";

type Stage = "BACKGROUND" | "SITE";

interface Props {
  currentStage: Stage | "SCENE" | "VIDEO" | "GENERATING_VIDEO";
  activeTab: Stage;
  onStageClick: (stage: Stage) => void;
  hasFrames?: boolean;
  hasMessages?: boolean;
}

const STAGES = [
  { id: "BACKGROUND", label: "01 Build background" },
  { id: "SITE", label: "02 Build website" },
];

export const StageIndicator = ({ activeTab, onStageClick, hasFrames, hasMessages }: Props) => {
  const activeIndex = STAGES.findIndex((s) => s.id === activeTab);

  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    if (idx === 1) return hasFrames || hasMessages;
    return false;
  };

  return (
    <div className="flex items-center w-full p-3 gap-x-2">
      {STAGES.map((stage, idx) => {
        const isActive = activeIndex === idx;
        const unlocked = isUnlocked(idx);
        const [num, ...rest] = stage.label.split(" ");
        const text = rest.join(" ");

        return (
          <Fragment key={stage.id}>
            <button
              onClick={() => onStageClick(stage.id as Stage)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-[64px] rounded-[16px] border-[1px] transition-all font-mono",
                isActive
                  ? "border-white bg-[#212121] text-white"
                  : unlocked
                    ? "border-transparent bg-[#212121] text-white/50 hover:text-white/80 hover:bg-[#212121] cursor-pointer"
                    : "border-transparent bg-[#212121] text-white/30 cursor-not-allowed"
              )}
              disabled={!unlocked}
            >
              <span className="text-xs mb-[4px] text-[#666666] font-dm-mono">{num}</span>
              <span className="text-sm text-white leading-tight text-center px-1 font-onest">{text}</span>
            </button>

            {idx < STAGES.length - 1 && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/arrow.svg" alt="arrow" className="w-3 h-auto opacity-70" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
