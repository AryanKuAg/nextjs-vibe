import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { codeAgentFunction, veoGenerateFunction } from "@/inngest/functions";
import { autonomousAgentFunction } from "@/inngest/autonomous";
import { generateFramesFunction, extractFramesFunction } from "@/inngest/mediaAgents";
import { resetMonthlyCredits } from "@/inngest/credit-reset";

// Allow Vercel serverless functions to run up to 5 minutes
// Required for long E2B sandbox operations and GCS deployments
export const maxDuration = 300;

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    codeAgentFunction,
    veoGenerateFunction,
    autonomousAgentFunction,
    generateFramesFunction,
    extractFramesFunction,
    resetMonthlyCredits,
  ],
});
