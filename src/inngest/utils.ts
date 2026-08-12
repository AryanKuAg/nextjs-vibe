import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, Message, TextMessage } from "@inngest/agent-kit";

import { SANDBOX_TIMEOUT } from "./types";

export async function getSandbox(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.setTimeout(SANDBOX_TIMEOUT);
  return sandbox;
};

export function lastAssistantTextMessageContent(result: AgentResult) {
  const lastAssistantTextMessageIndex = result.output.findLastIndex(
    (message) => message.role === "assistant",
  );

  const message = result.output[lastAssistantTextMessageIndex] as
    | TextMessage
    | undefined;

  return message?.content
    ? typeof message.content === "string"
      ? message.content
      : message.content.map((c) => c.text).join("")
    : undefined;
};

/**
 * Detects a network that is looping without doing anything.
 *
 * The routers here only stop on a task summary, so an agent that returns
 * nothing at all is indistinguishable from one that is still working: the
 * router hands it straight back and the network burns every one of its
 * `maxIter` slots. A build hit this with a model that kept returning
 * `finish_reason: "error"` / `native_finish_reason: "MALFORMED_FUNCTION_CALL"`
 * — content null, no tool calls, zero tokens billed. Sixteen iterations, then
 * sixteen more for the corrective pass, was twenty minutes of nothing.
 *
 * An iteration is "barren" when the model neither called a tool nor said
 * anything. One can be a hiccup; several in a row means it is not going to
 * recover, so stop and let the caller report a real error.
 */
export function createProgressGuard(limit = 2) {
  let barren = 0;

  return {
    /** Returns true when the network has stalled and should be stopped. */
    stalled(lastResult: AgentResult | undefined): boolean {
      if (!lastResult) return false;

      const calledTool = (lastResult.toolCalls?.length ?? 0) > 0;
      const said = (lastAssistantTextMessageContent(lastResult) ?? "").trim().length > 0;

      if (calledTool || said) {
        barren = 0;
        return false;
      }

      barren += 1;
      return barren >= limit;
    },
    get barrenCount() {
      return barren;
    },
  };
}

export const parseAgentOutput = (value: Message[] | undefined) => {
  if (!value || value.length === 0) {
    return undefined;
  }
  
  const output = value[0];

  if (!output || output.type !== "text") {
    return "Fragment";
  }

  if (Array.isArray(output.content)) {
    return output.content.map((txt) => typeof txt === "string" ? txt : txt.text).join("")
  } else {
    return output.content
  }
};
