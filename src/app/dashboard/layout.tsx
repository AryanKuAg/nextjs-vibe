import { Metadata } from "next";

import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Framerate projects and account settings.",
  robots: NO_INDEX,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
