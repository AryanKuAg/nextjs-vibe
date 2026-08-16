"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import "remixicon/fonts/remixicon.css";

type Option<T extends string> = {
  value: T;
  /** Heading in the menu. */
  title: string;
  description: string;
  icon: string;
};

/**
 * A pill in the composer that opens a short menu of alternatives.
 *
 * Each entry carries a description because the choices are not self-evident —
 * "Scroll-driven" versus "Looping" is a real difference in what gets built, and
 * a bare label would make the reader guess.
 */
export function ComposerChipMenu<T extends string>({
  ariaLabel,
  chipIcon,
  chipLabel,
  disabled = false,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  chipIcon: string;
  chipLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  value: T;
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="flex h-8 items-center gap-1.5 rounded-full border border-white-8 px-3 text-sm leading-[20px] text-white-85 transition-colors hover:bg-white-4 disabled:opacity-50"
        disabled={disabled}
        // Keeps focus in the textarea so opening a menu does not dismiss the
        // caret the user is about to type at.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <i className={`${chipIcon} text-sm`} />
        <span className="whitespace-nowrap">{chipLabel}</span>
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line text-xs text-white-50`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-10 left-0 z-50 flex w-[280px] flex-col gap-0.5 rounded-[12px] border border-white-8 bg-grey-bg p-1.5 shadow-xl"
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            role="menu"
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {options.map((option) => (
              <button
                className={`flex items-start gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-white-8 ${
                  option.value === value ? "bg-white-8" : ""
                }`}
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="menuitemradio"
                aria-checked={option.value === value}
                type="button"
              >
                <i className={`${option.icon} mt-0.5 shrink-0 text-base text-white-85`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-[20px] text-white">{option.title}</span>
                  <span className="block text-xs leading-[18px] text-white-50">
                    {option.description}
                  </span>
                </span>
                {option.value === value && (
                  <i className="ri-check-line mt-0.5 shrink-0 text-base text-white" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
