import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { veoGenerateFunction } from "@/inngest/video";
import { generateFramesFunction } from "@/inngest/mediaAgents";
import { resetMonthlyCredits } from "@/inngest/credit-reset";
import { runCancelledFunction } from "@/inngest/cancelled";

/**
 * Inngest now runs the media pipeline only. Site builds moved to the v0
 * Platform API and are driven straight from the browser through
 * `/api/v0/*`, so there is no code-agent function left to register.
 */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    veoGenerateFunction,
    generateFramesFunction,
    resetMonthlyCredits,
    runCancelledFunction,
  ],
});
