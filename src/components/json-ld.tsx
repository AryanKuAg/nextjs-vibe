/**
 * Structured data for search engines and AI crawlers. A server component, so
 * the block is in the HTML a crawler fetches rather than added later by script.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // `<` is escaped so no string in the data can close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
