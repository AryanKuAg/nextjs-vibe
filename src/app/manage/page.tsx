"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";
import { useRouter } from "next/navigation";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageAccountPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { user } = useUser();
  const { signOut } = useClerk();

  const { data: usage, isLoading: isUsageLoading } = useQuery(trpc.usage.status.queryOptions());

  const portalMutation = useMutation(trpc.usage.portalUrl.mutationOptions({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to generate billing portal link");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to access billing portal. No active subscription found.");
    }
  }));

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account & all data? This cannot be undone.")) {
      try {
        await user?.delete();
        toast.success("Account deleted successfully");
        router.push("/");
      } catch {
        toast.error("Failed to delete account");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] text-white font-inconsolata flex flex-col font-mono selection:bg-[#F1336E]/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28]">
        <div className="flex items-center gap-2 text-sm text-[#8A8A8A]">
          <Link href="/" className="hover:text-white transition-colors duration-200">
            Dashboard
          </Link>
          <i className="ri-arrow-right-s-line" />
          <span className="text-[#EBEBEB]">Manage account</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#2A2A28] rounded-[8px] px-3 py-1.5 text-sm text-white">
            {usage ? `${usage.remainingPoints.toLocaleString()}/${usage.maxPoints.toLocaleString()} credits left` : "Loading credits..."}
          </div>
          <UserControl showName={false} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto py-12 px-6 overflow-y-auto">
        <section className="mb-14">
          <h2 className="text-xl font-bold mb-6 text-white tracking-wide">General</h2>
          
          <div className="space-y-8">
            <div className="flex flex-col gap-1 pb-4 border-b border-[#2A2A28]/50">
              <span className="text-sm text-[#EBEBEB] font-medium">Email</span>
              <span className="text-sm text-[#8A8A8A]">
                {user?.primaryEmailAddress?.emailAddress || <Skeleton className="h-4 w-48 bg-[#2A2A28]" />}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 pb-4 border-b border-[#2A2A28]/50">
              <span className="text-sm text-[#EBEBEB] font-medium">Name</span>
              <span className="text-sm text-[#8A8A8A]">
                {user?.fullName || <Skeleton className="h-4 w-32 bg-[#2A2A28]" />}
              </span>
            </div>
            
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A28]/50">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#EBEBEB] font-medium">Current Plan</span>
                <span className="text-sm text-[#8A8A8A] capitalize">
                  {isUsageLoading ? <Skeleton className="h-4 w-16 bg-[#2A2A28]" /> : (usage?.plan || "Free")}
                </span>
              </div>
              <Button 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending || usage?.plan === "free" || !usage?.plan}
                className="bg-transparent text-white border border-[#3B3B3B] hover:bg-[#2A2A28] h-9 px-4 rounded-[8px] text-sm font-inconsolata"
              >
                {portalMutation.isPending ? "Redirecting..." : "Manage subscription"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between pb-4 border-b border-[#2A2A28]/50">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#EBEBEB] font-medium">Sign out</span>
                <span className="text-sm text-[#8A8A8A]">
                  Sign out from this device
                </span>
              </div>
              <Button 
                onClick={handleSignOut}
                className="bg-transparent text-white border border-[#3B3B3B] hover:bg-[#2A2A28] h-9 px-4 rounded-[8px] text-sm font-inconsolata"
              >
                Sign out
              </Button>
            </div>
            
            <div className="flex items-center justify-between pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-[#EBEBEB] font-medium">Delete account</span>
                <span className="text-sm text-[#8A8A8A]">
                  Permanently delete your account and all data
                </span>
              </div>
              <Button 
                onClick={handleDeleteAccount}
                className="bg-transparent text-[#F1336E] border border-[#3B3B3B] hover:bg-[#F1336E]/10 h-9 px-4 rounded-[8px] text-sm font-inconsolata transition-colors"
              >
                Delete account
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
