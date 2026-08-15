/**
 * `Project.videoUrls` is a JSON column written by several generations of the
 * media pipeline, so entries are either a bare URL string or
 * `{ url, blockIndex }`. Readers should go through here rather than each
 * re-deriving which shape they are looking at.
 */
export function videoUrlsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && "url" in entry) {
        const url = (entry as { url?: unknown }).url;
        return typeof url === "string" ? url : null;
      }
      return null;
    })
    .filter((url): url is string => Boolean(url));
}

/** The most recently generated video — what a new site build should use. */
export function latestVideoUrl(value: unknown): string | null {
  const urls = videoUrlsOf(value);
  return urls.length > 0 ? urls[urls.length - 1] : null;
}
