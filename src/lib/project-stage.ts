/**
 * Values for `project.currentStage`, shared between the agents that write it and
 * the UI that turns it into a status line. Keep this free of server-only imports.
 *
 * The GENERATING_* / BUILDING_SITE values mean "an agent is doing this right
 * now". The rest are resting states between runs.
 */
export const PROJECT_STAGE = {
  /** Resting: at the background step. */
  SCENE: "SCENE",
  /** Resting: a video exists. */
  VIDEO: "VIDEO",
  /** Resting: a site has been built. */
  SITE: "SITE",

  /** Active: the image agent is running. */
  GENERATING_SCENE: "GENERATING_SCENE",
  /** Active: the video agent is running. */
  GENERATING_VIDEO: "GENERATING_VIDEO",
  /** Active: the code agent is running. */
  BUILDING_SITE: "BUILDING_SITE",

  /**
   * Active, step not yet known. Written the moment a run is dispatched so the
   * stage from the previous turn can't be read as this turn's status — without
   * it, a follow-up shows "Building website" before anything has started.
   */
  THINKING: "THINKING",
} as const;
