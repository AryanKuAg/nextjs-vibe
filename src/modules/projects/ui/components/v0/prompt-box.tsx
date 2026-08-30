"use client";

import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import "remixicon/fonts/remixicon.css";

import {
  COMPOSER_MODELS,
  ComposerModelMenu,
} from "@/modules/home/ui/components/composer-model-menu";

/**
 * The builder's composer.
 *
 * Deliberately the same object as the one on the home page — same 12px box,
 * same model chip, same round send button — because it is the same gesture in
 * a different place. It resting one line tall (84px) rather than two is the
 * only difference the design draws between them.
 *
 * The model chip is display only, exactly as on the home page: the follow-up
 * route pins v0 Mini server-side and discards whatever the client asks for.
 */
export function PromptBox({
  onSubmit,
  onStop,
  isSubmitting = false,
  isStopping = false,
  isStreaming = false,
  placeholder = "Describe your website",
  autoFocus = false,
}: {
  onSubmit?: (text: string) => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  isSubmitting?: boolean;
  isStopping?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState<string>(COMPOSER_MODELS[0].value);

  const canSend = value.trim().length > 0 && !isSubmitting && Boolean(onSubmit);

  const send = () => {
    if (!canSend) return;
    const text = value.trim();
    setValue("");
    void onSubmit?.(text);
  };

  return (
    <form
      className="relative flex min-h-[84px] w-full flex-col gap-3 rounded-[12px] bg-white-8 p-3 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.35)]"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <TextareaAutosize
        autoFocus={autoFocus}
        className="block w-full resize-none bg-transparent text-sm leading-[20px] font-onest font-medium text-white-85 outline-none placeholder:text-white-50"
        disabled={isSubmitting}
        maxRows={8}
        minRows={1}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        placeholder={placeholder}
        value={value}
      />

      <div className="flex items-center">
        <ComposerModelMenu
          disabled={isSubmitting}
          menuPlacement="up"
          onChange={setModel}
          value={model}
        />

        <div className="ml-auto shrink-0">
          {isStreaming ? (
            <button
              aria-label="Stop generating"
              className="flex size-7 items-center justify-center rounded-full bg-white-16 text-white transition-all hover:bg-white/25 active:scale-95 disabled:opacity-50"
              disabled={!onStop || isStopping}
              onClick={() => void onStop?.()}
              type="button"
            >
              {isStopping ? (
                <i className="ri-loader-4-line inline-block animate-spin" />
              ) : (
                // Drawn rather than an icon-font glyph: the design's stop mark
                // is a 10px rounded square, and ri-stop-fill sits at its own
                // proportions inside the line box.
                <span className="size-[10px] rounded-[2px] bg-white" />
              )}
            </button>
          ) : (
            <button
              aria-label="Send message"
              className={
                canSend
                  ? "flex size-7 items-center justify-center rounded-full bg-white text-bg transition-transform hover:bg-white-85 active:scale-95"
                  : "flex size-7 items-center justify-center rounded-full bg-white-50 text-bg"
              }
              disabled={!canSend}
              type="submit"
            >
              {isSubmitting ? (
                <i className="ri-loader-4-line inline-block animate-spin" />
              ) : (
                <i className="ri-arrow-up-line text-base" />
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
