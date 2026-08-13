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

/**
 * Wall-clock accounting for one agent network, printed as a single line at the end.
 *
 * A slow build is not diagnosable from the Inngest UI without clicking each
 * `code-agent-run` span in turn and reading its metadata one at a time. The
 * interesting quantities are aggregate — how many turns did the loop take, and
 * how was the time distributed across them — because those decide whether a
 * build is slow due to token volume per turn (fix: reasoning effort, smaller
 * writes) or due to turn count (fix: fewer round trips, parallelism).
 *
 * `record` is called from the router, which runs once after each turn, so an
 * interval spans one LLM call PLUS the tool execution it triggered. That is
 * deliberate: it is the wall-clock the user actually waits through. Compare the
 * per-turn ms here against `output_tokens` on the matching span to get the
 * effective tokens/sec.
 */
export function createTurnTracker(label: string) {
  const startedAt = Date.now();
  let lastMark = startedAt;
  const turns: { ms: number; chars: number; tools: number }[] = [];

  return {
    record(lastResult: AgentResult | undefined) {
      if (!lastResult) return;
      const now = Date.now();
      turns.push({
        ms: now - lastMark,
        chars: (lastAssistantTextMessageContent(lastResult) ?? "").length,
        tools: lastResult.toolCalls?.length ?? 0,
      });
      lastMark = now;
    },
    log() {
      const totalMs = Date.now() - startedAt;
      if (turns.length === 0) {
        console.log(`[Turns:${label}] no turns recorded (${(totalMs / 1000).toFixed(1)}s)`);
        return;
      }
      const secs = (ms: number) => (ms / 1000).toFixed(1);
      const slowest = turns.reduce((a, b) => (b.ms > a.ms ? b : a));
      console.log(
        `[Turns:${label}] ${turns.length} turns in ${secs(totalMs)}s | ` +
        `slowest ${secs(slowest.ms)}s | ` +
        `per-turn ${turns.map((t) => `${secs(t.ms)}s/${t.tools}t`).join(" ")}`,
      );
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
