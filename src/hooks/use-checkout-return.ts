"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

/**
 * Handles the redirect back from Dodo checkout (`?checkout=success`).
 *
 * Dodo returns the customer as soon as the payment clears, which can be before
 * its webhook reaches us — so the plan and credits are still the old ones on
 * first paint. This polls the usage query until the upgrade shows up rather than
 * leaving the user staring at a stale balance.
 *
 * Reads `window.location` instead of `useSearchParams` so the caller doesn't need
 * a Suspense boundary.
 */
export const useCheckoutReturn = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    hasRun.current = true;

    // Drop the flag so a refresh doesn't re-trigger the poll.
    params.delete("checkout");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );

    const usageQuery = trpc.usage.status.queryOptions();
    const planBefore = (
      queryClient.getQueryData(usageQuery.queryKey) as { plan?: string } | undefined
    )?.plan;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts++;
      await queryClient.invalidateQueries({ queryKey: usageQuery.queryKey });

      const current = queryClient.getQueryData(usageQuery.queryKey) as
        | { plan?: string }
        | undefined;

      if (current?.plan && current.plan !== "free" && current.plan !== planBefore) {
        toast.success(`You're on the ${current.plan} plan — credits added.`);
        return;
      }

      if (attempts < POLL_ATTEMPTS) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      toast.message(
        "Payment received. Your credits will appear shortly — refresh if they don't."
      );
    };

    poll();

    return () => clearTimeout(timer);
    // Runs once on mount; the ref guards against StrictMode double-invoke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
