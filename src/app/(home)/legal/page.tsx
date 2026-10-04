import { permanentRedirect } from "next/navigation";

/**
 * /legal held both documents behind a tab in client state. Each now has its
 * own address; this keeps old links, including /legal?tab=privacy, working.
 */
export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  permanentRedirect(tab === "privacy" ? "/privacy" : "/terms");
}
