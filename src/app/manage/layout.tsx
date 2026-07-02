import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Subscription — Framerate",
  description: "Manage your Framerate subscription and billing settings.",
};

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
