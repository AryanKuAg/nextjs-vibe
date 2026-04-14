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
            "relative rounded-2xl overflow-hidden transition-all duration-200 border border-white/10",
            "bg-[#151515]/90 backdrop-blur-xl",
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
                  "px-5 pt-5 pb-8",
                  "text-[15px] leading-relaxed text-white/90",
                  "placeholder:text-white/30",
                  "transition-colors"
                )}
                placeholder="Create a 3D landing page for a SaaS startup..."
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
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex gap-x-2 items-center flex-1">
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
              >
                <i className="ri-add-line text-lg" />
              </button>
              <div className="h-7 px-3 flex items-center gap-1.5 rounded-full bg-white/5 border border-white/5 text-[11px] font-medium text-white/70 hover:bg-white/10 transition-colors cursor-pointer tracking-wide">
                <span>Gemini 3.1 Pro</span>
                <i className="ri-arrow-down-s-line ml-0.5 text-white/40" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-[11px] text-white/40 font-mono hidden sm:flex items-center">
                Use <kbd className="mx-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">shift</kbd> + <kbd className="mx-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px]">return</kbd> for a new line
              </div>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className={cn(
                  "flex items-center justify-center size-7 rounded-full transition-all duration-150",
                  isButtonDisabled
                    ? "bg-white/10 text-white/20 cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/90 active:scale-95 shadow-sm"
                )}
              >
                {isPending ? (
                  <i className="ri-loader-4-line text-sm leading-none animate-spin" />
                ) : (
                  <i className="ri-arrow-up-line text-sm leading-none" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ── Template chips ── */}
        <div className="hidden md:flex flex-wrap justify-center gap-2">
          {[
            "SaaS landing page+",
            "App website",
            "AI startup homepage+",
            "Personal portfolio"
          ].map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => onSelect(`Build me a ${title.replace('+','')}`)}
              className={cn(
                "inline-flex items-center px-4 py-1.5 rounded-full",
                "text-[13px] font-medium text-white/80",
                "bg-black/40 backdrop-blur-md hover:bg-black/60 hover:text-white active:scale-[0.98]",
                "transition-all duration-200 border border-white/10"
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
