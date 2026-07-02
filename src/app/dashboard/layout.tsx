import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Framerate",
  description: "Manage your Framerate projects and account settings.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
