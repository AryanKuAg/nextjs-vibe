/**
 * v0 SDK calls resolve to `{ data, error, response }` instead of throwing.
 * This forwards whichever of the two came back, preserving v0's status code so
 * the SWR hooks in the builder see the real failure rather than a generic 500.
 *
 * `response` is optional in practice: a transport-level failure resolves with
 * an error and no response at all, and reading `.status` off it threw a
 * TypeError that turned a recoverable upstream hiccup into a 500 from us.
 */
type V0JsonResult = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

export function toV0JsonResponse(result: V0JsonResult, data: unknown = result.data) {
  const status = result.response?.status ?? (result.error === undefined ? 200 : 502);

  return Response.json(result.error === undefined ? data : result.error, { status });
}
