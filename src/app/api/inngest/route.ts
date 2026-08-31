import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { generateFramesFunction } from "@/inngest/mediaAgents";
import { resetMonthlyCredits } from "@/inngest/credit-reset";
import { runCancelledFunction } from "@/inngest/cancelled";

/**
 * Inngest now runs the image agent only. Site builds moved to the v0 Platform
 * API and are driven straight from the browser through `/api/v0/*`, so there is
 * no code-agent function left to register — and the video agent it used to run
 * alongside is gone with the model it called.
 */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateFramesFunction,
    resetMonthlyCredits,
    runCancelledFunction,
  ],
});
