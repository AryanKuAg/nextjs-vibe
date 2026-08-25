/**
 * Local runs must never pay for real media generation.
 *
 * The image agent bills a third party per call, so on a developer machine it is
 * short-circuited to a fixed demo asset. The agent behaves the same either way —
 * same stages, same approval cards, same URLs flowing downstream — only the paid
 * call is skipped.
 *
 * Keep this file free of server-only imports: it is read from inside Inngest
 * steps and from the agent graph.
 */

/** Stand-in returned instead of a generated background image. */
export const MOCK_IMAGE_URL =
  process.env.MOCK_MEDIA_IMAGE_URL || "https://assets.framerate.space/Hero%20BG%20IMG.png";

/**
 * Whether to serve that stand-in instead of calling the paid model.
 *
 * `MOCK_MEDIA` decides it outright when set. Otherwise it follows NODE_ENV,
 * which covers `next dev` but not a production build run against localhost —
 * hence the explicit override, so a local run can never be billed by accident.
 */
export function shouldMockMedia(): boolean {
  const flag = process.env.MOCK_MEDIA?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return process.env.NODE_ENV === "development";
}
