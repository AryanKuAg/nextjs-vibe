"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import "remixicon/fonts/remixicon.css";

import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal = ({
  isOpen,
  onClose,
}: AccountSettingsModalProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const { user } = useUser();
  const { signOut } = useClerk();

  const { data: usage, isLoading: isUsageLoading } = useQuery(trpc.usage.status.queryOptions());

  const portalMutation = useMutation(
    trpc.usage.portalUrl.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast.error("Failed to generate billing portal link", { duration: Infinity });
        }
      },
      onError: (error) => {
        toast.error(
          error.message || "Failed to access billing portal. No active subscription found.",
          { duration: Infinity }
        );
      },
    })
  );

  const deleteAccountMutation = useMutation(trpc.usage.deleteAccount.mutationOptions());

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account & all data? This cannot be undone.")) {
      try {
        await deleteAccountMutation.mutateAsync();
        await user?.delete();
        toast.success("Account and data deleted successfully");
        router.push("/");
      } catch (error: unknown) {
        toast.error((error as Error)?.message || "Failed to delete account", { duration: Infinity });
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-grey-bg rounded-[16px] w-full max-w-[600px] border-[0.5px] border-white-12 relative overflow-hidden"
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-sm font-medium leading-[20px] text-white-50">
                Account settings
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors h-7 w-7 hover:bg-white-8 rounded-[6px] flex items-center justify-center group"
              >
                <i className="ri-close-line text-[20px] group-hover:text-white-85" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-[2px] pb-4 border-b-[0.5px] border-white-8">
                <span className="text-[12px] text-white-50 leading-[18px]">Email</span>
                <span className="text-sm leading-[20px] text-white-85">
                  {user?.primaryEmailAddress?.emailAddress || <Skeleton className="h-4 w-48 bg-[#2A2A28]" />}
                </span>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-[2px] pb-4 border-b-[0.5px] border-white-8">
                <span className="text-[12px] text-white-50 leading-[18px]">Name</span>
                <span className="text-sm leading-[20px] text-white-85">
                  {user?.fullName || <Skeleton className="h-4 w-32 bg-[#2A2A28]" />}
                </span>
              </div>

              {/* Current Plan */}
              <div className="flex items-center justify-between pb-4 border-b-[0.5px] border-white-8">
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[12px] text-white-50 leading-[18px]">Current plan</span>
                  <span className="text-sm leading-[20px] text-white-85 capitalize">
                    {isUsageLoading ? <Skeleton className="h-4 w-16 bg-[#2A2A28]" /> : (usage?.plan || "Free")}
                  </span>
                </div>
                <button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending || usage?.plan === "free" || !usage?.plan}
                  className="px-2 rounded-[6px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[12px] hover:bg-white-8  disabled:opacity-50 h-[28px] font-medium"
                >
                  {portalMutation.isPending ? "Redirecting..." : "Manage subscription"}
                </button>
              </div>

              {/* Sign out */}
              <div className="flex items-center justify-between pb-4 border-b-[0.5px] border-white-8">
                <span className="text-sm leading-[20px] text-white-85">Sign out</span>
                <button
                  onClick={handleSignOut}
                  className="px-2 rounded-[6px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[12px] hover:bg-white-8  disabled:opacity-50 h-[28px] font-medium"
                >
                  Sign out
                </button>
              </div>

              {/* Delete account */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm leading-[20px] text-white-85">Delete account</span>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                  className="px-2 rounded-[6px] border-[0.5px] border-white-12 bg-transparent text-white-85 text-[12px] hover:bg-white-8  disabled:opacity-50 h-[28px] font-medium"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
