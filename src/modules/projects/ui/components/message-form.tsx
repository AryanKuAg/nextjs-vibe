import { z } from "zod";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";
import { FOLLOW_UP_COST } from "@/lib/pricing";

const MODELS = [
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", credits: 100 },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite", credits: 80 }
] as const;

type ModelId = typeof MODELS[number]["id"];


interface Props {
  projectId: string;
  stage?: "SCENE" | "VIDEO" | "SITE";
  extractedZipUrl?: string | null;
};

const formSchema = z.object({
  value: z.string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
})

export const MessageForm = ({ projectId, stage = "SITE", extractedZipUrl }: Props) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-3.1-pro-preview");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect follow-up: any existing SITE-stage message means this is a follow-up prompt
  const { data: existingMessages } = useQuery({
    ...trpc.messages.getMany.queryOptions({ projectId, stage }),
    staleTime: 30_000,
  });
  const isFollowUp = stage === "SITE" && (existingMessages?.length ?? 0) > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const buildSite = useMutation(trpc.projects.buildSite.mutationOptions({
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries(trpc.messages.getMany.queryOptions({ projectId, stage }));
      queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
      queryClient.invalidateQueries(trpc.usage.status.queryOptions());
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error.message, { duration: Infinity });
      }
    },
  }));

  const createMessage = useMutation(trpc.messages.create.mutationOptions({
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries(
        trpc.messages.getMany.queryOptions({ projectId, stage }),
      );
      queryClient.invalidateQueries(
        trpc.usage.status.queryOptions()
      );
    },
    onError: (error) => {
      if (error.data?.code === "TOO_MANY_REQUESTS" || error.message?.toLowerCase().includes("credits")) {
        setShowCreditsModal(true);
      } else {
        toast.error(error.message, { duration: Infinity });
      }
    },
  }));

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (stage === "SITE") {
      try {
        await buildSite.mutateAsync({
          value: values.value,
          projectId,
          videoUrl: extractedZipUrl || undefined,
          model: selectedModel,
          isFollowUp,
        });
      } catch {
        // Error is handled in the mutation's onError callback
      }
    } else {
      try {
        await createMessage.mutateAsync({
          value: values.value,
          projectId,
          stage,
          model: selectedModel,
        });
      } catch {
        // Error is handled in the mutation's onError callback
      }
    }
  };

  const isPending = createMessage.isPending || buildSite.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <>
      <CustomOutOfCreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-[#272725] border border-[#282825] rounded-[8px] p-3 space-y-3 relative transition-all"
        >
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                minRows={2}
                maxRows={14}
                className="w-full bg-transparent text-sm text-white outline-none resize-none min-h-[80px]"
                placeholder="Prompt here"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          <div className="flex items-center gap-x-2">
            <div className="relative" ref={dropdownRef}>
              <div
                className="h-8 pl-2.5 pr-2 flex items-center gap-1 rounded-full border-[0.5px] border-[#3B3B3B] text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setModelDropdownOpen((o) => !o)}
              >
                <span>{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                <i className="ri-arrow-down-s-line mt-0.5 text-white text-base" />
              </div>

              {modelDropdownOpen && (
                <div className="absolute bottom-10 left-0 z-50 bg-[#272725] border border-[#3B3B3B] rounded-[8px] overflow-hidden min-w-[200px] shadow-xl">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-inconsolata transition-colors hover:bg-white/5 ${selectedModel === model.id ? "text-white" : "text-[#CCCCCC]"
                        }`}
                    >
                      <div className="flex w-full items-center font-inconsolata">
                        <span>{model.label}</span>
                        {selectedModel === model.id && <i className="ri-check-line ml-auto text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <div className="flex items-center gap-1 text-[#CCCCCC]">
                <i className="ri-sparkling-fill text-white text-sm" />
                <span className="text-sm font-medium">
                  {isFollowUp ? FOLLOW_UP_COST : MODELS.find(m => m.id === selectedModel)?.credits}
                </span>
              </div>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] hover:bg-[#cccccc] transition-all shadow-sm active:scale-95"
              >
                {isPending ? (
                  <i className="ri-loader-4-line animate-spin inline-block" />
                ) : (
                  <i className="ri-arrow-up-line text-[#1C1C1C]" />
                )}
              </button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
};
