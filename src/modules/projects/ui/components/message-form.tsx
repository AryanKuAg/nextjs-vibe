import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";

import { Usage } from "./usage";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFocused, setIsFocused] = useState(false);

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

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
    },
    onError: (error) => toast.error(error.message),
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
      toast.error(error.message);

      if (error.data?.code === "TOO_MANY_REQUESTS") {
        router.push("/pricing");
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
        });
      } catch (e) {
        toast.error("Failed to build site: " + String(e));
      }
    } else {
      await createMessage.mutateAsync({
        value: values.value,
        projectId,
        stage,
      });
    }
  };
  
  const isPending = createMessage.isPending || buildSite.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;
  const showUsage = !!usage;

  return (
    <Form {...form}>
      {showUsage && (
        <Usage
          points={usage.remainingPoints}
          msBeforeNext={usage.msBeforeNext}
        />
      )}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
          isFocused && "shadow-xs",
          showUsage && "rounded-t-none",
        )}
      >
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <TextareaAutosize
              {...field}
              disabled={isPending}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={2}
              maxRows={8}
              className="pt-4 resize-none border-none w-full outline-none bg-transparent text-sm placeholder:text-muted-foreground/50"
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
        <div className="flex gap-x-2 items-center pt-2">
          <div className="flex gap-x-2 items-center flex-1">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/5"
            >
              <i className="ri-add-line" />
            </button>
            <div className="h-8 px-3 flex items-center gap-2 rounded-full bg-[#1e1e1e] border border-white/5 text-xs text-white/70 cursor-pointer hover:bg-[#252525] transition-colors">
              <span>Gemini 3.1 Pro</span>
              <i className="ri-arrow-down-s-line" />
            </div>
          </div>
          <Button
            disabled={isButtonDisabled}
            className={cn(
              "w-8 h-8 p-0 rounded-full bg-white text-black hover:bg-white/90",
              isButtonDisabled && "opacity-50"
            )}
          >
            {isPending ? (
              <i className="ri-loader-4-line text-base leading-none animate-spin" />
            ) : (
              <i className="ri-arrow-up-line text-base leading-none" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
