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

import { PROJECT_TEMPLATES } from "../../constants";

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
            "relative rounded-2xl overflow-hidden transition-all duration-200",
            "bg-[#1c1c1c]",
            isFocused && "ring-2 ring-white/10"
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
                  "px-5 pt-5 pb-2",
                  "text-[15px] leading-relaxed text-white/90",
                  "placeholder:text-white/30",
                  "transition-colors"
                )}
                placeholder="Create a landing page for…"
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
          <div className="flex items-center justify-between px-4 pb-4 pt-1">
            {/* Image icon (left) */}
            <button
              type="button"
              aria-label="Attach image"
              className={cn(
                "flex items-center justify-center size-9 rounded-xl",
                "text-white/40 hover:text-white/70 hover:bg-white/8",
                "transition-all duration-150"
              )}
            >
              <i className="ri-image-line text-xl leading-none" />
            </button>

            {/* Send button (right) */}
            <button
              type="submit"
              disabled={isButtonDisabled}
              aria-label="Submit"
              className={cn(
                "flex items-center justify-center size-9 rounded-full",
                "transition-all duration-150 font-medium",
                isButtonDisabled
                  ? "bg-white/15 text-white/30 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90 active:scale-95 shadow-sm"
              )}
            >
              {isPending ? (
                <i className="ri-loader-4-line text-base leading-none animate-spin" />
              ) : (
                <i className="ri-arrow-up-line text-base leading-none" />
              )}
            </button>
          </div>
        </form>

        {/* ── Template chips ── */}
        <div className="hidden md:flex flex-wrap justify-center gap-2">
          {PROJECT_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              onClick={() => onSelect(template.prompt)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full",
                "text-sm font-medium text-white",
                "bg-[#1c1c1c] hover:bg-[#2a2a2a] active:scale-[0.97]",
                "transition-all duration-150",
                "border border-transparent hover:border-white/10"
              )}
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }}
            >
              <span>{template.emoji}</span>
              <span>{template.title}</span>
            </button>
          ))}
        </div>
      </section>
    </Form>
  );
};
