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
      // list-outside overrides the list-inside Streamdown sets on its own list
      // elements. Inside markers sit in the text flow, so a wrapped line runs
      // back to the margin under the bullet instead of hanging under the first
      // line's text, and padding meant to separate bullet from text shifts the
      // whole row instead. Outside puts the marker in the gutter, where the
      // padding below is what actually sets the gap.
      "[&_ul]:my-3 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
      "[&_ol]:my-3 [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
      // Loose markdown lists wrap each item in a <p>; zeroing its margin keeps
      // item spacing governed by space-y alone rather than doubling up.
      "[&_li]:marker:text-white/30 [&_li>p]:my-0",
      "[&_a]:underline [&_a]:underline-offset-2",
      "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
      "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-3",
      className,
    )}
    {...props}
  />
));

Response.displayName = "Response";
