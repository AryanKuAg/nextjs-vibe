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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center h-12 px-2 bg-[#121212]/90 border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-xs font-medium">
        {/* Left side: Logo */}
        <div className="flex items-center gap-2 pl-3 pr-5 border-r border-white/10 h-full">
          <Image src="/logo.svg" alt="Spatial" width={18} height={18} />
          <span className="text-white/90 font-semibold tracking-wide">Spatial</span>
        </div>

        {/* Center: Links */}
        <div className="hidden md:flex items-center gap-8 px-6 text-white/50">
          <Link href="#" className="hover:text-white transition-colors tracking-wide">Examples</Link>
          <Link href="#" className="hover:text-white transition-colors tracking-wide">Pricing</Link>
          <Link href="#" className="hover:text-white transition-colors tracking-wide">3D builder</Link>
          <SignedOut>
            <SignInButton>
              <button className="hover:text-white transition-colors tracking-wide">Login</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/projects" className="hover:text-white transition-colors tracking-wide">Dashboard</Link>
          </SignedIn>
        </div>

        {/* Right: Auth */}
        <div className="hidden md:flex items-center pl-4 pr-1 h-full">
          <SignedOut>
            <SignUpButton>
              <button className="bg-white text-black px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors font-semibold">Sign up</button>
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
