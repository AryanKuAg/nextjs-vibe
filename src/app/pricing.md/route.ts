import { pricingMd } from "@/lib/llms";

// Built once at deploy from the same data as the pages.
export const dynamic = "force-static";

export function GET() {
  return new Response(pricingMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
