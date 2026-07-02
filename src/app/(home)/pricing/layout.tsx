import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Framerate",
  description: "Simple, transparent pricing. Create stunning 3D websites instantly with Framerate.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
