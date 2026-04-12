import { useState } from "react";
import { PROJECT_TEMPLATES } from "@/modules/home/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  startFrameUrl: string | null;
  endFrameUrl: string | null;
  initialPrompt?: string;
  onFramesGenerated: (startUrl?: string, endUrl?: string) => void;
  onNext: () => void;
}

type Target = "both" | "start" | "end";

export const SceneBuilder = ({
  projectId,
  startFrameUrl,
  endFrameUrl,
  initialPrompt = "",
  onFramesGenerated,
  onNext
}: Props) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [target, setTarget] = useState<Target>("both");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, target, projectId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate frames");
      }

      const data = await res.json();
      onFramesGenerated(data.startFrameUrl, data.endFrameUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const isNextDisabled = !startFrameUrl || !endFrameUrl;

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-xl font-medium text-white/90">01. Build your scene</h2>
        <p className="text-sm text-white/50">Describe the opening and closing frames for your animation.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase">Scene opens with</label>
            <div className="aspect-video bg-[#1c1c1c] rounded-lg border border-white/5 overflow-hidden relative flex items-center justify-center">
              {startFrameUrl ? (
                <img src={startFrameUrl} alt="Start frame" className="w-full h-full object-cover" />
              ) : (
                <div className="text-white/20"><i className="ri-image-2-line text-4xl" /></div>
              )}
              {isGenerating && (target === "both" || target === "start") && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <i className="ri-loader-4-line text-3xl animate-spin text-white" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase">Scene ends with</label>
            <div className="aspect-video bg-[#1c1c1c] rounded-lg border border-white/5 overflow-hidden relative flex items-center justify-center">
              {endFrameUrl ? (
                <img src={endFrameUrl} alt="End frame" className="w-full h-full object-cover" />
              ) : (
                <div className="text-white/20"><i className="ri-image-2-line text-4xl" /></div>
              )}
              {isGenerating && (target === "both" || target === "end") && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <i className="ri-loader-4-line text-3xl animate-spin text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          {PROJECT_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.title}
              onClick={() => setPrompt(tmpl.prompt)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 border border-transparent hover:border-white/10 transition-colors"
            >
              {tmpl.emoji} {tmpl.title}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/5 space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <select 
            value={target} 
            onChange={(e) => setTarget(e.target.value as Target)}
            className="bg-[#1c1c1c] border border-white/10 rounded-lg px-2 text-sm text-white/80 outline-none"
            disabled={isGenerating}
          >
            <option value="both">Both frames</option>
            <option value="start">Start frame</option>
            <option value="end">End frame</option>
          </select>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the scene..."
            className="flex-1 bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
            disabled={isGenerating}
          />
          <Button type="submit" disabled={isGenerating || !prompt.trim()} size="icon" className="shrink-0 rounded-lg">
            {isGenerating ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-fill" />}
          </Button>
        </form>

        <Button 
          className="w-full rounded-lg" 
          variant="secondary"
          disabled={isNextDisabled || isGenerating}
          onClick={onNext}
        >
          Build video <i className="ri-arrow-right-line ml-2" />
        </Button>
      </div>
    </div>
  );
};
