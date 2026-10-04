import { Metadata } from "next";

import { NO_INDEX } from "@/lib/seo";

/** A signed-in workspace: private to its owner, and nothing a search engine should hold. */
export const metadata: Metadata = {
  title: "Projects",
  robots: NO_INDEX,
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
