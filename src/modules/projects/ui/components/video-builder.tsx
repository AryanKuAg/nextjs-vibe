import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

interface Props {
  projectId: string;
  selectedSceneUrl: string | null;
  isGenerating: boolean;
  onNext: () => void;
  onBack: () => void;
  onClearSelection?: () => void;
}

export const VideoBuilder = ({ projectId, selectedSceneUrl, isGenerating, onBack, onClearSelection }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);

  const startVideoGeneration = useMutation(
    trpc.projects.startVideoGeneration.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
        toast.info("Started generating video. This will take a few minutes...");
        setPrompt("");
        // Don't auto-clear image so user can iterate on the same image
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start video generation");
      }
    })
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const hasImage = selectedSceneUrl || uploadedBase64;
    if (!prompt.trim() || isGenerating || !hasImage) return;
    
    await startVideoGeneration.mutateAsync({ 
      projectId, 
      prompt,
      imageUrl: selectedSceneUrl || undefined,
      imageBase64: uploadedBase64 || undefined
    });
  };

  const currentImage = uploadedBase64 || selectedSceneUrl;

  return (
    <div className="flex flex-col h-full bg-sidebar relative">
      <div className="flex-1" />

      <div className="p-4 space-y-3">
        <div className="bg-[#1c1c1c] border border-white/5 rounded-2xl p-3 space-y-3">
          {/* Image thumbnail preview or Upload Box */}
          {currentImage ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage}
                alt="Selected scene"
                className="w-16 h-16 rounded-xl object-cover border border-white/10"
              />
              <button 
                onClick={() => {
                  setUploadedBase64(null);
                  onClearSelection?.();
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white/50 hover:text-white border border-white/10 text-xs"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-16 h-16 rounded-xl border border-dashed border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <i className="ri-image-line text-white/30 text-xl" />
            </label>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to create"
            className="w-full bg-transparent text-sm text-white/90 outline-none resize-none min-h-[80px]"
            disabled={isGenerating || startVideoGeneration.isPending}
          />

          <div className="flex items-center gap-x-2">
            <div className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] text-white/70">
              <span>Veo 3.1</span>
              <i className="ri-arrow-down-s-line" />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating || startVideoGeneration.isPending || !prompt.trim() || !currentImage}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-[#333333] hover:bg-white/20 text-white disabled:opacity-30 transition-all shadow-sm"
            >
              {isGenerating || startVideoGeneration.isPending ? (
                <i className="ri-loader-4-line animate-spin" />
              ) : (
                <i className="ri-arrow-up-line" />
              )}
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full rounded-xl bg-transparent border-white/5 text-white/70 hover:bg-white/5 text-xs font-medium h-10 transition-all"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

