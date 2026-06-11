"use client";

/**
 * Explicit client-component wrapper for HydrationBoundary.
 *
 * @tanstack/react-query's HydrationBoundary calls useQueryClient() internally.
 * When a server component (page) directly renders HydrationBoundary, Turbopack
 * sometimes resolves the React module from two different chunk bundles, causing
 * a null context error on useContext.
 *
 * Wrapping it in a 'use client' file forces Turbopack to always use the same
 * client-side React instance for both the provider (QueryClientProvider in
 * TRPCReactProvider) and the consumer (HydrationBoundary).
 */
import { HydrationBoundary as RQHydrationBoundary, type HydrationBoundaryProps } from "@tanstack/react-query";

export function HydrationBoundary(props: HydrationBoundaryProps) {
  return <RQHydrationBoundary {...props} />;
}
