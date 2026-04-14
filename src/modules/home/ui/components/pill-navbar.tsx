"use client";

import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser, useClerk } from "@clerk/nextjs";

const UserAvatarButton = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  const initial = user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?";
  const imageUrl = user?.imageUrl;

  return (
    <button
      onClick={() => signOut({ redirectUrl: "/" })}
      className="flex items-center gap-2.5 pl-1 pr-4 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={initial}
          width={28}
          height={28}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="size-7 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
          {initial}
        </div>
      )}
      <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors font-mono">Sign out</span>
    </button>
  );
};

export const PillNavbar = () => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[590px] px-4">
      <div className="flex items-center justify-between h-[56px] px-2 bg-[#1C1C1C] rounded-[8px] font-inconsolata">
        {/* Left side: Logo */}
        <div className="flex items-center gap-3 pl-2">
          <Image src="/logo.svg" alt="Spatial" width={22} height={22} />
          <span className="text-white font-[500] tracking-wide text-base">Spatial</span>
        </div>

        {/* Center: Links */}
        <div className="hidden md:flex items-center gap-4 text-white text-sm">
          <Link href="#" className="">How it works</Link>
          <Link href="#" className="">Pricing</Link>
          <Link href="#" className="">Contact</Link>
          <SignedIn>
            <Link href="/projects" className="hover:text-white transition-colors">Dashboard</Link>
          </SignedIn>
        </div>

        {/* Right: Auth */}
        <div className="flex items-center h-full">
          <SignedOut>
            <SignUpButton>
              <button className="bg-white text-black px-3 py-2 rounded-[6px] font-[500] text-sm flex items-center gap-2">
                <Image src="/google.svg" alt="Google" width={16} height={16} />
                Get started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserAvatarButton />
          </SignedIn>
        </div>
      </div>
    </div>
  );
};
