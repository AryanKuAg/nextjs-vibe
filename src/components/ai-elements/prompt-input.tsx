"use client";

import {
  Children,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The composer used by the builder's prompt box.
 *
 * This is a trimmed version of the upstream ai-elements `PromptInput`: the same
 * component names and layout, without the attachment pipeline, drag-and-drop or
 * speech recognition. The builder sends text only — a reference image is
 * attached in the composer when the project is created, not pasted into the
 * chat — so those subsystems had nothing to drive them.
 */

export type PromptInputMessage = {
  text: string;
};

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export const PromptInput = ({ className, onSubmit, children, ...props }: PromptInputProps) => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("message") ?? "");

    if (!text.trim()) return;

    // Clear optimistically: submission is fire-and-forget from the composer's
    // point of view, and leaving the sent text behind invites a double send.
    form.reset();

    await onSubmit({ text }, event);
  };

  return (
    <form
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card",
        "focus-within:border-white-16",
        className,
      )}
      onSubmit={handleSubmit}
      ref={formRef}
      {...props}
    >
      {children}
    </form>
  );
};

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div className={cn("contents", className)} {...props} />
);

export type PromptInputTextareaProps = ComponentProps<"textarea">;

export const PromptInputTextarea = ({
  className,
  placeholder = "What would you like to build?",
  ...props
}: PromptInputTextareaProps) => {
  // IME composition (Japanese, Chinese, Korean) also ends on Enter. Submitting
  // there would swallow the candidate the user was choosing.
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (isComposing || event.nativeEvent.isComposing) return;

    event.preventDefault();

    const form = event.currentTarget.form;
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit?.disabled) return;

    form?.requestSubmit();
  };

  return (
    <textarea
      className={cn(
        "field-sizing-content max-h-48 min-h-16 w-full resize-none border-none bg-transparent",
        "text-foreground outline-none placeholder:text-muted-foreground",
        className,
      )}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
};

export type PromptInputFooterProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <div className={cn("flex items-center justify-between gap-1", className)} {...props} />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props} />
);

export type PromptInputButtonProps = ComponentProps<typeof Button>;

export const PromptInputButton = ({
  variant = "ghost",
  size,
  className,
  ...props
}: PromptInputButtonProps) => (
  <Button
    className={cn("text-muted-foreground", className)}
    // A lone icon gets a square button; an icon plus a label needs the room.
    size={size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm")}
    type="button"
    variant={variant}
    {...props}
  />
);

export type PromptInputSubmitProps = ComponentProps<typeof Button>;

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  ...props
}: PromptInputSubmitProps) => (
  <Button className={cn(className)} size={size} type="submit" variant={variant} {...props} />
);
