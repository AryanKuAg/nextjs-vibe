import { cn } from "@/lib/utils";

type Stage = "SCENE" | "GENERATING_VIDEO" | "VIDEO" | "SITE";

interface Props {
  currentStage: Stage;
  onStageClick: (stage: Stage) => void;
}

const STAGES = [
  { id: "SCENE", label: "01 Build scene" },
  { id: "VIDEO", label: "02 Build video" },
  { id: "SITE", label: "03 Build site" },
];

export const StageIndicator = ({ currentStage, onStageClick }: Props) => {
  const isVideoLoading = currentStage === "GENERATING_VIDEO";
  const activeIndex = STAGES.findIndex((s) => s.id === (isVideoLoading ? "VIDEO" : currentStage));

  return (
    <div className="flex items-center gap-x-2 px-4 py-3 bg-sidebar border-b">
      {STAGES.map((stage, idx) => {
        const isActive = activeIndex === idx;
        const isPast = activeIndex > idx;
        
        return (
          <div key={stage.id} className="flex items-center gap-x-2">
            <button
              onClick={() => onStageClick(stage.id as Stage)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                isActive
                  ? "border-white text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                  : isPast
                    ? "border-white/20 text-white/50 hover:text-white/80 cursor-pointer"
                    : "border-white/10 text-white/30 cursor-not-allowed"
              )}
              disabled={!isActive && !isPast}
            >
              {stage.label}
            </button>
            
            {idx < STAGES.length - 1 && (
              <i className="ri-arrow-right-line text-white/20 text-xs" />
            )}
          </div>
        );
      })}
    </div>
  );
};
