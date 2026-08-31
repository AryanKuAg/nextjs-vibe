"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import "remixicon/fonts/remixicon.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTRPC } from "@/trpc/client";
import { AccountSettingsModal } from "@/components/account-settings-modal";
import { CustomOutOfCreditsModal } from "@/components/custom-out-of-credits-modal";

import { useRouter } from "next/navigation";

interface Props {
  showName?: boolean;
};

export const UserControl = ({ showName }: Props) => {
  const router = useRouter();
  const trpc = useTRPC();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isMounted, setIsMounted] = useState(false);

  const { data: usage } = useQuery(trpc.usage.status.queryOptions());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !user) return null;

  const isPaid = usage?.plan && usage.plan !== "free";
  const remaining = Number(usage?.remainingCredits || 0);
  const total = Number(usage?.totalCredits || 1);
  const progressPercent = Math.min((remaining / total) * 100, 100);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none flex items-center gap-2">
          <Avatar className="h-[28px] w-[28px] rounded-[8px] transition-opacity hover:opacity-80">
            <AvatarImage src={user.imageUrl} />
            <AvatarFallback className="rounded-full bg-[#F1336E] text-white">
              {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showName && (
            <span className="text-sm text-white font-sans truncate max-w-[100px] hidden sm:inline-block">
              {user.fullName || user.firstName}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[216px]  bg-[#2f2f2f] text-white font-sans rounded-[10px] shadow-xl border-0 p-0"
        >
          {/* User info header */}
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="flex flex-col gap-1 min-w-0">
              <Avatar className="h-[20px] w-[20px] rounded-[6px] mb-1 shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="rounded-[8px] bg-[#F1336E] text-white">
                  {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0 leading-[18px]!">
                <span className="text-xs text-white truncate leading-[18px]">
                  {user.fullName || "User"}
                </span>
                <span className="text-xs text-white-50 truncate leading-[18px]">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>
            {isPaid && (
              <span className=" font-medium h-[20px] text-white bg-white-8 border border-white-12 rounded-[6px] px-[6px] shrink-0 text-xs leading-[18px]">
                {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)}
              </span>
            )}
          </div>

          {/* Upgrade button (free) or Credits bar (paid) */}
          {isPaid ? (
            <div className="mb-2 px-3">
              <div className="w-full h-[2px] bg-white-8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-white-85 leading-[12px] font-medium">
                {remaining.toLocaleString("en-US")}/{total.toLocaleString("en-US")} Credits Left
              </span>
            </div>
          ) : (
            <button onClick={() => setIsPricingModalOpen(true)} className="block w-full mb-3 px-3 focus:outline-none ">
              <div className="w-full text-center text-xs font-medium text-white border-[0.5px] border-white-85 rounded-lg hover:bg-white-4 transition-colors cursor-pointer h-[28px] leading-[26px]">
                Upgrade
              </div>
            </button>
          )}
          {/* Projects + Account Settings */}
          <div className="border-t-[0.5px] border-white-8 p-1.5 flex flex-col gap-[3px]">
            <DropdownMenuItem
              onClick={() => router.push('/projects')}
              className="cursor-pointer py-[6px] px-[8px] flex items-center gap-2 hover:bg-white-8 rounded-lg focus:text-white h-[28px] mb-[3px] group"
            >
              <i className="ri-folder-line text-white-50 text-base group-hover:text-white-85" />
              <span className="text-[12px] text-white">Projects</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setIsSettingsModalOpen(true)}
              className="cursor-pointer py-[6px] px-[8px] flex items-center gap-2 hover:bg-white-8 rounded-lg focus:text-white h-[28px] group"
            >
              <i className="ri-settings-3-line text-white-50 text-base group-hover:text-white-85" />
              <span className="text-[12px] text-white">Account Settings</span>
            </DropdownMenuItem>
          </div>

          {/* Give Feedback + Terms And Privacy */}
          <div className="border-t-[0.5px] border-white-8 p-1.5 flex flex-col gap-[3px]">
            <DropdownMenuItem
              onClick={() => window.open('https://tally.so/r/81gPzk', '_blank')}
              className="cursor-pointer py-[6px] px-[8px] flex items-center gap-2 hover:bg-white-8 rounded-lg focus:text-white h-[28px] group"
            >
              <i className="ri-chat-1-line text-white-50 text-base group-hover:text-white-85" />
              <span className="text-[12px] text-white">Give Feedback</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => window.open('/legal', '_blank')}
              className="cursor-pointer py-[6px] px-[8px] flex items-center gap-2 hover:bg-white-8 rounded-lg focus:text-white h-[28px]  group"
            >
              <i className="ri-file-text-line text-white-50 text-base group-hover:text-white-85" />
              <span className="text-[12px] text-white">Terms And Privacy</span>
            </DropdownMenuItem>
          </div>

          {/* Log Out */}
          <div className="border-t-[0.5px] border-white-8 p-1.5 flex flex-col gap-[3px]">
            <DropdownMenuItem
              onClick={() => signOut({ redirectUrl: '/' })}
              className="cursor-pointer py-[6px] px-[8px] flex items-center gap-2 hover:bg-white-8 rounded-lg focus:text-white h-[28px] group"
            >
              <i className="ri-logout-box-r-line text-white-50 text-base group-hover:text-white-85" />
              <span className="text-[12px] text-white">Log Out</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <CustomOutOfCreditsModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </>
  );
};
