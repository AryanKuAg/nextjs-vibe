"use client";

import type { ComponentProps } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

/**
 * Markdown renderer for assistant output. Streamdown (rather than a plain
 * markdown component) because it renders partial documents sanely — mid-stream
 * an unterminated code fence or list must not reflow the whole message.
 */
export const Response = memo(({ className, ...props }: ResponseProps) => (
  <Streamdown
    className={cn(
      "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
      "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6",
      "[&_li]:pl-1 [&_li]:marker:text-muted-foreground/40",
      "[&_a]:underline [&_a]:underline-offset-2",
      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
      "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-3",
      className,
    )}
    {...props}
  />
));

Response.displayName = "Response";
