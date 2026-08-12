/**
 * The single source of truth for the shimmering status line.
 *
 * Two places render it — the standalone row under the thread and the header of
 * an in-flight assistant card — and they must never disagree about what the
 * agent is doing.
 */

import { PROJECT_STAGE } from "@/lib/project-stage";

export const AGENT_STATUS = {
  WORKING: "Working",
  THINKING: "Thinking",
  SCENE: "Generating scene",
  VIDEO: "Generating video",
  SITE: "Building website",
  COMPLETED: "Completed",
} as const;

export interface AgentStatusInput {
  /** `project.currentStage`, polled from the server. */
  currentStage?: string | null;
  /** Button the user just pressed, used to pre-empt the poll. */
  lastAction?: string | null;
  /** Actions on the card that button belonged to — disambiguates scene vs video. */
  interactiveButtonActions?: string[];
  /** Body text of that card, same purpose. */
  interactiveText?: string | null;
  /**
   * `step` from the card's payload — "SCENE" or "VIDEO". The authoritative
   * marker, set by the node that wrote the card. Cards written before it
   * existed have none, hence the fallbacks below.
   */
  interactiveStep?: string | null;
  /**
   * True while the user's message is still the newest thing in the thread, i.e.
   * the agent has not reported anything back yet. Distinguishes the opening
   * "Working" from a mid-run "Thinking".
   */
  awaitingFirstResponse?: boolean;
}

/**
 * Whether an interactive card belongs to the video step rather than the scene
 * step. "Prompt Again" and "Let AI Create" sit on both cards, so the card they
 * were pressed on is the only thing that tells the two apart — which agent runs
 * next, and therefore which price it charges.
 */
export function isVideoStepCard({
  interactiveStep,
  interactiveButtonActions = [],
  interactiveText,
}: Pick<AgentStatusInput, "interactiveStep" | "interactiveButtonActions" | "interactiveText">): boolean {
  // Cards carry their step outright. Prefer it: the older signals below read the
  // card's prose, which makes a copy edit silently mis-price the next run.
  if (interactiveStep) return interactiveStep === "VIDEO";

  return (
    interactiveButtonActions.includes("USE_VIDEO") ||
    Boolean(interactiveText?.toLowerCase().includes("background video"))
  );
}

export function resolveAgentStatus({
  currentStage,
  lastAction,
  interactiveButtonActions = [],
  interactiveText,
  interactiveStep,
  awaitingFirstResponse = false,
}: AgentStatusInput): string {
  // 1. Optimistic, from the button the user just pressed. This wins over the
  //    stage because `currentStage` still describes the step that just finished
  //    until the agent gets around to updating it.
  if (lastAction === "USE_VIDEO" || lastAction === "FULL_PAGE" || lastAction === "HERO_ONLY") {
    return AGENT_STATUS.SITE;
  }
  if (lastAction === "ANIMATE_VIDEO") {
    return AGENT_STATUS.VIDEO;
  }
  if (lastAction === "AI_CREATE" || lastAction === "WRITE_PROMPT" || lastAction === "REGENERATE") {
    // These labels appear on both the scene and the video approval cards, so the
    // card the user clicked is what tells us which step comes next.
    return isVideoStepCard({ interactiveStep, interactiveButtonActions, interactiveText })
      ? AGENT_STATUS.VIDEO
      : AGENT_STATUS.SCENE;
  }

  // 2. What the backend says it is actually doing right now.
  if (currentStage === PROJECT_STAGE.GENERATING_SCENE) return AGENT_STATUS.SCENE;
  if (currentStage === PROJECT_STAGE.GENERATING_VIDEO) return AGENT_STATUS.VIDEO;
  if (currentStage === PROJECT_STAGE.BUILDING_SITE) return AGENT_STATUS.SITE;

  // 3. Nothing specific to report. "Working" only covers the gap before the
  //    agent has said anything; after that it is thinking about something.
  return awaitingFirstResponse ? AGENT_STATUS.WORKING : AGENT_STATUS.THINKING;
}
