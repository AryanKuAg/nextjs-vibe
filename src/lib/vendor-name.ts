/**
 * Keeping the vendor's name out of anything a customer reads.
 *
 * Upstream error text is shown verbatim — it is far more useful than anything
 * we could invent ("You have reached your daily message limit") — but it names
 * the API we resell, and so does the client SDK's own fallback wording
 * ("v0 proxy request failed: 405 Method Not Allowed"). Both run through here.
 *
 * This module is deliberately free of `server-only`: the same scrubbing has to
 * happen in the browser, where the SDK builds those messages.
 */
const VENDOR_NAME = /\bv0(?:\.(?:dev|app))?\b/gi;

export function scrubVendor(message: string): string {
  return message.replace(VENDOR_NAME, (_match, offset: number) =>
    offset === 0 ? "The build service" : "the build service",
  );
}
