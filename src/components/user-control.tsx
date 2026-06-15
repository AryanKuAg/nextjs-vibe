"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useRouter } from "next/navigation";

interface Props {
  showName?: boolean;
};

export const UserControl = ({ showName }: Props) => {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none flex items-center gap-2">
        <Avatar className="h-[36px] w-[36px] rounded-full transition-opacity hover:opacity-80">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback className="rounded-full bg-[#F1336E] text-white">
            {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {showName && (
          <span className="text-sm text-white font-onest truncate max-w-[100px] hidden sm:inline-block">
            {user.fullName || user.firstName}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[300px] p-2 bg-[#272725] border-[#3B3B3B] text-white font-onest rounded-xl shadow-xl"
      >
        <div className="flex items-center gap-3 p-2 mb-2">
          <Avatar className="h-10 w-10 rounded-md">
            <AvatarImage src={user.imageUrl} />
            <AvatarFallback className="rounded-md bg-[#F1336E] text-white">
              {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-[15px] font-[500] leading-none mb-1 text-white">
              {user.fullName || "User"}
            </span>
            <span className="text-[13px] text-[#8A8A88] truncate">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </div>
        </div>

        <DropdownMenuItem
          onClick={() => router.push('/projects')}
          className="cursor-pointer p-2 flex items-center gap-3 hover:bg-background focus:bg-background rounded-lg focus:text-white"
        >
          <i className="ri-folder-2-line text-[#8A8A88] text-lg" />
          <span className="text-[15px] font-medium text-[#EBEBEB]">Projects</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push('/manage')}
          className="cursor-pointer p-2 flex items-center gap-3 hover:bg-background focus:bg-background rounded-lg focus:text-white"
        >
          <i className="ri-user-line text-[#8A8A88] text-lg" />
          <span className="text-[15px] font-medium text-[#EBEBEB]">Manage account</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => signOut({ redirectUrl: '/' })}
          className="cursor-pointer p-2 flex items-center gap-3 hover:bg-background focus:bg-background rounded-lg mt-1 focus:text-white"
        >
          <i className="ri-logout-box-r-line text-[#8A8A88] text-lg" />
          <span className="text-[15px] font-medium text-[#EBEBEB]">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
