import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  isGenerating: boolean;
  videoUrl: string | null;
  onNext: () => void;
}

export const VideoBuilder = ({ projectId, isGenerating, videoUrl, onNext }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");

  const startVideoGeneration = useMutation(
    trpc.projects.startVideoGeneration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
        toast.info("Started generating video. This will take a few minutes...");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start video generation");
      }
    })
  );

  const cancelGeneration = useMutation(
    trpc.projects.cancelVideoGeneration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
        toast.success("Generation forcibly cancelled.");
      },
      onError: (error) => {
        toast.error("Failed to cancel: " + error.message);
      }
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await startVideoGeneration.mutateAsync({ projectId, prompt });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-medium text-white/90">02. Build your video</h2>
          <p className="text-sm text-white/50">Describe the transition between your keyframes.</p>
        </div>

        <div className="aspect-video bg-[#1c1c1c] rounded-xl border border-white/5 overflow-hidden relative flex flex-col items-center justify-center p-6 text-center">
          {videoUrl ? (
            <video 
              src={videoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : isGenerating ? (
            <div className="space-y-4 relative z-10 w-full max-w-md mx-auto">
              <i className="ri-loader-4-line text-4xl animate-spin text-white/50 inline-block mb-2" />
              <h3 className="text-lg font-medium text-white/90">Creating your video</h3>
              <p className="text-sm text-white/50 pb-4">
                Veo 3.1 is synthesizing a 5-second cinematic transition. This typically takes 2–3 minutes.
              </p>
              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mb-6">
                <div className="bg-white h-full rounded-full animate-[pulse_2s_ease-in-out_infinite] w-3/4" />
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => cancelGeneration.mutate({ projectId })}
                disabled={cancelGeneration.isPending}
                className="mt-6 rounded-full px-6 py-1 h-8 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 shadow-none z-20 mx-auto"
              >
                {cancelGeneration.isPending ? "Cancelling..." : "Stop Generation"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-white/30">
              <i className="ri-movie-2-line text-5xl" />
              <p className="text-sm">Ready to generate</p>
            </div>
          )}

          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-xs font-medium text-white/80 z-10">
            <span className="text-[10px]">✦</span> Veo 3.1 Fast
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5 space-y-4">
        {!videoUrl && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the cinematic motion..."
              className="flex-1 bg-[#1c1c1c] border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
              disabled={isGenerating}
            />
            <Button 
              type="submit" 
              disabled={isGenerating || !prompt.trim() || startVideoGeneration.isPending} 
              size="icon" 
              className="shrink-0 rounded-lg"
            >
              {startVideoGeneration.isPending ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-send-plane-fill" />}
            </Button>
          </form>
        )}

        <Button 
          className="w-full rounded-lg" 
          variant={videoUrl ? "default" : "secondary"}
          disabled={!videoUrl || isGenerating}
          onClick={onNext}
        >
          Build site <i className="ri-arrow-right-line ml-2" />
        </Button>
      </div>
    </div>
  );
};
