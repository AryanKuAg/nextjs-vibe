"use client";

import { Loader } from "@/components/ai-elements/loader";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { ArrowUpIcon, StopIcon, V0LogoIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { V0_MODEL_LABEL } from "@/lib/v0-model";

export function PromptBox({
  onSubmit,
  onStop,
  isSubmitting = false,
  isStopping = false,
  isStreaming = false,
  placeholder = "Describe what you want to build...",
  autoFocus = false,
  compact = false,
  className,
  defaultPrompt,
}: {
  onSubmit?: (text: string) => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  isSubmitting?: boolean;
  isStopping?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  className?: string;
  /** Seeds the (uncontrolled) textarea. Change the component's key to reseed. */
  defaultPrompt?: string;
}) {
  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || !onSubmit || isSubmitting) return;
    return onSubmit(text);
  };

  return (
    <PromptInput
      className={cn("rounded-2xl border-border bg-card shadow-sm", className)}
      onSubmit={handleSubmit}
    >
      <PromptInputBody>
        <PromptInputTextarea
          autoFocus={autoFocus}
          className={cn(
            "min-h-[52px] bg-transparent px-4 pt-3.5 text-base",
            compact && "min-h-[44px] px-3 pt-3 text-sm",
          )}
          defaultValue={defaultPrompt}
          disabled={isSubmitting}
          placeholder={placeholder}
        />
      </PromptInputBody>
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          {/* Not a picker. v0 Mini is the only model this app runs on, and the
              server substitutes it regardless of what the browser sends — this
              is a label so the user can see which model is answering. */}
          <PromptInputButton
            className="gap-1.5 hover:bg-transparent hover:text-muted-foreground"
            disabled
            tabIndex={-1}
          >
            <V0LogoIcon className="size-4" />
            <span>{V0_MODEL_LABEL}</span>
          </PromptInputButton>
        </PromptInputTools>

        <PromptInputTools>
          <PromptInputSubmit
            aria-label={isStreaming ? "Stop generating" : "Send message"}
            className="size-8 rounded-lg"
            disabled={isStreaming ? !onStop || isStopping : !onSubmit || isSubmitting}
            onClick={isStreaming ? () => onStop?.() : undefined}
            type={isStreaming ? "button" : "submit"}
          >
            {isStopping || (isSubmitting && !isStreaming) ? (
              <Loader size={16} />
            ) : isStreaming ? (
              <StopIcon className="size-4" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </PromptInputSubmit>
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  );
}
