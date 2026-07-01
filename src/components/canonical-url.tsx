"use client";

import { usePathname } from "next/navigation";

export function CanonicalUrl() {
  const pathname = usePathname();
  const url = `https://framerate.space${pathname === '/' ? '' : pathname}`;
  
  return (
    <link rel="canonical" href={url} />
  );
}
