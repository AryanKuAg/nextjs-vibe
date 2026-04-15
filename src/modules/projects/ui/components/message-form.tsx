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

  return (
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={2}
              maxRows={8}
              className="w-full bg-transparent text-sm text-white/90 outline-none resize-none min-h-[80px]"
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
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent text-white transition-colors border-[0.5px] border-[#3B3B3B] px-2.5 py-2"
          >
            <i className="ri-add-line" />
          </button>
          <div className="flex items-center gap-x-1.5 px-2.5 py-2 rounded-full bg-transparent border-[0.5px] border-[#3B3B3B] text-sm text-white cursor-pointer">
            <span>Gemini 3.1 Pro</span>
            <i className="ri-arrow-down-s-line" />
          </div>

          <button
            type="submit"
            disabled={isButtonDisabled}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-white text-white disabled:bg-[#666666] transition-all shadow-sm"
          >
            {isPending ? (
              <i className="ri-loader-4-line animate-spin inline-block" />
            ) : (
              <i className="ri-arrow-up-line text-[#1C1C1C]" />
            )}
          </button>
        </div>
      </form>
    </Form>
  );
};
