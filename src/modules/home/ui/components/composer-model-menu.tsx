"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "remixicon/fonts/remixicon.css";

export type ComposerModel = {
  value: string;
  label: string;
};

export const COMPOSER_MODELS: readonly ComposerModel[] = [
  { value: "grok-4.6", label: "Grok 4.6" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "opus-5", label: "Opus 5" },
];

/**
 * The model name in the composer toolbar, and the short list behind it.
 *
 * Opens upward: on the landing page the composer is pinned to the bottom of the
 * left panel, so a menu dropping down would open off-screen.
 */
export function ComposerModelMenu({
  disabled = false,
  onChange,
  options = COMPOSER_MODELS,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  options?: readonly ComposerModel[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Model"
        className={`flex h-7 items-center gap-1 rounded-full pl-2 pr-1.5 text-sm leading-[20px] font-onest font-medium text-white-85 transition-colors hover:bg-white-8 disabled:opacity-50 ${open ? "bg-white-8" : ""
          }`}
        disabled={disabled}
        // Keeps focus in the textarea so opening the menu does not dismiss the
        // caret the user is about to type at.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="whitespace-nowrap [text-box:trim-both_cap_alphabetic]">{selected.label}</span>
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line text-xs text-white`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-9 left-0 z-50 flex w-[180px] flex-col gap-2 rounded-[12px] border border-white-4 bg-[#1e1e1e] p-1 shadow-xl"
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            role="menu"
            transition={{ duration: 0.10, ease: "easeOut" }}
          >
            {options.map((option) => (
              <button
                aria-checked={option.value === value}
                className="flex h-7 items-center gap-2 rounded-[8px] px-2 text-left transition-colors hover:bg-white-8"
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span className="min-w-0 flex-1 text-sm leading-[20px] font-onest font-medium text-white-85">
                  {option.label}
                </span>
                {option.value === value && (
                  <i className="ri-check-line shrink-0 text-base text-white-85" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
