import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { homeGraph } from "@/lib/structured-data";
import { HomeMarketing } from "@/modules/home/ui/components/home-marketing";
import { HomeView } from "@/modules/home/ui/views/home-view";

export const metadata: Metadata = pageMetadata({
  title: SITE_TITLE,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function Page() {
  // Read on the server so the first HTML is already the right view: the landing
  // page for signed-out visitors and crawlers, the dashboard's frame for anyone
  // signed in.
  const { userId } = await auth();

  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeView signedIn={userId !== null} marketing={<HomeMarketing />} />
    </>
  );
}
