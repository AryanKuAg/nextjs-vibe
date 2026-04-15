"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Form, FormField } from "@/components/ui/form";

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(10000, { message: "Value is too long" }),
});

export const ProjectForm = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const clerk = useClerk();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);

        if (error.data?.code === "UNAUTHORIZED") {
          clerk.openSignIn();
        }

        if (error.data?.code === "TOO_MANY_REQUESTS") {
          router.push("/pricing");
        }
      },
    })
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createProject.mutateAsync({ value: values.value });
  };

  const onSelect = (value: string) => {
    form.setValue("value", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <section className="space-y-4 w-full">
        {/* ── Main input card ── */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative rounded-2xl overflow-hidden transition-all min-h-[148px]",
            "bg-[#1C1C1C]",
            isFocused && "ring-1 ring-white/20 border-white/20"
          )}
          style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.45)" }}
        >
          {/* Textarea */}
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                disabled={isPending}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                minRows={3}
                maxRows={10}
                className={cn(
                  "w-full resize-none border-none outline-none bg-transparent",
                  "px-4 pt-4 ",
                  "text-[15px] font-inconsolata leading-relaxed text-white",
                  "placeholder:text-[#666666] placeholder:text-[14px]",
                  "transition-colors"
                )}
                placeholder="Create a 3D landing page for a SaaS startup"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-4 pb-4 font-inconsolata pt-3">
            <div className="flex gap-x-1 items-center flex-1">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-transparent border-[0.5px] border-[#3B3B3B] hover:bg-white/5 text-[#CCCCCC] transition-colors"
              >
                <i className="ri-add-line text-lg" />
              </button>
              <div className="h-8 px-2.5 flex items-center gap-1.5 rounded-full border-[0.5px] border-[#3B3B3B] text-[13px] text-[#CCCCCC] hover:bg-white/5 transition-colors cursor-pointer">
                <span>Gemini 3.1 Pro</span>
                <i className="ri-arrow-down-s-line mt-0.5 text-white" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-[#666666] hidden sm:flex items-center tracking-wide">
                Use <kbd className="h-[18px] mx-1.5 px-1.5 rounded-[4px] bg-[#333333] text-[#CCCCCC] text-xs leading-[18px]">shift</kbd> + <kbd className="leading-[18px] h-[18px] mx-1.5 px-1.5  rounded-[4px] bg-[#333333] text-[#CCCCCC] text-xs">return</kbd> for a new line
              </div>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className={cn(
                  "flex items-center justify-center size-8 rounded-full transition-all duration-150",
                  isButtonDisabled
                    ? "bg-[#333333] text-[#1C1C1C] cursor-not-allowed"
                    : "bg-white text-[#1C1C1C]"
                )}
              >
                {isPending ? (
                  <i className="ri-loader-4-line text-[16px] animate-spin inline-block" />
                ) : (
                  <i className="ri-arrow-up-line text-[16px]" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ── Template chips ── */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 font-inconsolata">
          {[
            "SaaS landing page",
            "App website",
            "AI startup homepage",
            "Personal portfolio"
          ].map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => onSelect(`Build me a ${title.replace('+', '')}`)}
              className={cn(
                "inline-flex items-center px-2 py-1.5 rounded-[8px]",
                "text-sm text-white",
                "bg-[#1C1C1C4D] backdrop-blur-md  active:scale-[0.98]"
              )}
            >
              {title}
            </button>
          ))}
        </div>
      </section>
    </Form>
  );
};
