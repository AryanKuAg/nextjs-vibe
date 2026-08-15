/**
 * v0 SDK calls resolve to `{ data, error, response }` instead of throwing.
 * This forwards whichever of the two came back, preserving v0's status code so
 * the SWR hooks in the builder see the real failure rather than a generic 500.
 */
type V0JsonResult = {
  data: unknown;
  error?: unknown;
  response: Response;
};

export function toV0JsonResponse(result: V0JsonResult, data: unknown = result.data) {
  return Response.json(result.error === undefined ? data : result.error, {
    status: result.response.status,
  });
}
