import { cn } from "@/lib/utils";

type Stage = "SCENE" | "GENERATING_VIDEO" | "VIDEO" | "SITE";

interface Props {
  currentStage: Stage;
  activeTab: Stage;
  onStageClick: (stage: Stage) => void;
}

const STAGES = [
  { id: "SCENE", label: "01 Build scene" },
  { id: "VIDEO", label: "02 Build video" },
  { id: "SITE", label: "03 Build site" },
];

export const StageIndicator = ({ currentStage, activeTab, onStageClick }: Props) => {
  const isVideoLoading = currentStage === "GENERATING_VIDEO";
  const unlockedIndex = STAGES.findIndex((s) => s.id === (isVideoLoading ? "VIDEO" : currentStage));
  const activeIndex = STAGES.findIndex((s) => s.id === activeTab);

  return (
    <div className="flex items-center m-3 bg-sidebar"> {/* todo: add gap */}
      {STAGES.map((stage, idx) => {
        const isActive = activeIndex === idx;
        const isUnlocked = unlockedIndex >= idx;
        const [num, ...rest] = stage.label.split(" ");
        const text = rest.join(" ");

        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => onStageClick(stage.id as Stage)}
              className={cn(
                "flex flex-col items-center justify-center w-[94px] h-[64px] rounded-[8px] border-[1px] transition-all font-mono",
                isActive
                  ? "border-white bg-[#272725] text-white"
                  : isUnlocked
                    ? "border-transparent bg-[#272725] text-white/50 hover:text-white/80 hover:bg-[#272725] cursor-pointer"
                    : "border-transparent bg-[#272725] text-white/30 cursor-not-allowed"
              )}
              disabled={!isUnlocked}
            >
              <span className="text-xs mb-[4px] text-[#666666] font-dm-mono">{num}</span>
              <span className="text-xs text-white leading-tight text-center px-1 font-inconsolata">{text}</span>
            </button>

            {idx < STAGES.length - 1 && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/arrow.svg" alt="arrow" className="w-3 h-auto opacity-70 mx-2" />
            )}
          </div>
        );
      })}
    </div>
  );
};
