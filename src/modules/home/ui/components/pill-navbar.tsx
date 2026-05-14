"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SignedIn, SignedOut, useUser, useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const GoogleSignInButton = ({ fullWidth = false }: { fullWidth?: boolean }) => {
  const { signIn, isLoaded } = useSignIn();
  const [isPending, setIsPending] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!isLoaded || isPending) return;
    setIsPending(true);

    // Cancel One Tap if it's showing to prevent AbortError conflict
    try {
      window.google?.accounts.id.cancel();
    } catch {
      // Ignore cancel errors
    }

    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isPending}
      className={`bg-white text-black ${fullWidth ? 'w-full py-3.5 justify-center' : 'px-3 py-2 pr-4 sm:pr-6 lg:pr-3'} rounded-[8px] font-[500] text-sm flex items-center gap-2 disabled:opacity-70 transition-opacity`}
    >
      {isPending ? (
        <>
          <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Get started
        </>
      ) : (
        <>
          <Image src="/google.svg" alt="Google" width={16} height={16} />
          Get started
        </>
      )}
    </button>
  );
};

const UserAvatarButton = ({ mobile = false }: { mobile?: boolean }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const initial = (user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase();
  const imageUrl = user?.imageUrl;

  if (!user) return null;

  const dropdownContent = (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-[300px] p-2 bg-[#272725] border-[#3B3B3B] text-white font-inconsolata rounded-xl shadow-xl z-50"
    >
      <div className="flex items-center gap-3 p-2 mb-2">
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback className="rounded-md bg-[#F1336E] text-white">
            {initial}
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
  );

  if (mobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0 outline-none"
          >
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={initial}
                width={36}
                height={36}
                className="w-[36px] h-[36px] rounded-[8px] object-cover"
              />
            ) : (
              <div className="w-[36px] h-[36px] rounded-[10px] bg-pink-500 flex items-center justify-center">
                {initial}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        {dropdownContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none flex-shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={initial}
            width={36}
            height={36}
            className="w-[36px] h-[36px] rounded-[10px] object-cover"
          />
        ) : (
          <div className="w-[36px] h-[36px] rounded-[10px] bg-pink-500 flex items-center justify-center text-white text-[15px] font-bold">
            {initial}
          </div>
        )}
      </DropdownMenuTrigger>
      {dropdownContent}
    </DropdownMenu>
  );
};

export const PillNavbar = () => {
  const { user } = useUser();
  const router = useRouter();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
    })
  );

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setShowSignInModal(true);
    } else {
      await createProject.mutateAsync({ value: "" });
    }
  };

  const handleSitesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const sitesSection = document.getElementById("sites");
    if (sitesSection) {
      sitesSection.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  const isPending = createProject.isPending;
  if (!isMounted) return null;

  return (
    <>
      <CustomSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-20 w-full px-4 md:max-w-[600px] lg:max-w-fit">
        <div className="flex flex-col gap-2 relative w-full">
          <div className="flex items-center justify-between md:justify-normal gap-16 h-[52px] px-2 bg-black rounded-[16px] font-inconsolata" style={{ boxShadow: "0 0 8px 0 rgba(0,0,0,0.25)" }}>
            {/* Left side: Logo */}
            <Link href="/" className="flex items-center gap-2 pl-2">
              <Image src="/logo.png" alt="framerate" width={24} height={24} />
              <span className="text-white font-[500] text-[16px]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>framerate</span>
            </Link>

            {/* Center: Links (Desktop) */}
            <div className="hidden md:flex items-center gap-4 text-white text-sm">
              <button
                onClick={handleSitesClick}
                className="hover:text-[#CCCCCC] transition-colors"
              >
                Sites
              </button>
              <Link href="/pricing" className="">Pricing</Link>
              <Link href="mailto:teamframerate@gmail.com" className="">Contact</Link>
            </div>

            {/* Right: Auth & Hamburger */}
            <div className="flex items-center gap-2 h-[36px] text-nowrap">
              {/* Desktop Auth */}
              <div className="hidden md:flex items-center gap-2 h-[36px]">
                <SignedOut>
                  <GoogleSignInButton />
                </SignedOut>
                <SignedIn>
                  <button
                    onClick={handleDashboardClick}
                    disabled={isPending}
                    className="flex items-center justify-center px-4 h-[36px] rounded-[8px] border border-[#212121] text-[15px] font-[400] text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dashboard
                  </button>
                  <UserAvatarButton />
                </SignedIn>
              </div>

              {/* Mobile Auth & Hamburger */}
              <div className="flex md:hidden items-center gap-2 md:pr-1">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="flex items-center justify-center w-[36px] h-[36px] rounded-[10px] border border-[#2A2A2A] text-white hover:bg-[#282828] transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M4 8h16M10 16h10" />
                    </svg>
                  )}
                </button>
                <SignedIn>
                  <UserAvatarButton mobile />
                </SignedIn>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden w-full bg-[#212121] rounded-[16px] p-3 flex flex-col font-inconsolata border border-[#2A2A2A]" style={{ boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)" }}>
              <div className="flex flex-col text-[#E0E0E0] text-[15px]">
                <SignedIn>
                  <button onClick={handleSitesClick} className="w-full text-left px-3 py-2.5 rounded-[12px] hover:bg-white/5 transition-colors">
                    Sites
                  </button>
                </SignedIn>
                <SignedOut>
                  <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-3 py-2.5 rounded-[12px] hover:bg-white/5 transition-colors">
                    Examples
                  </Link>
                </SignedOut>
                <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-3 py-2.5 rounded-[12px] hover:bg-white/5 transition-colors">
                  Pricing
                </Link>
                <Link href="mailto:teamframerate@gmail.com" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-left px-3 py-2.5 rounded-[12px] hover:bg-white/5 transition-colors mb-2">
                  Contact
                </Link>

                <div className="">
                  <SignedOut>
                    <GoogleSignInButton fullWidth />
                  </SignedOut>
                  <SignedIn>
                    <button
                      onClick={(e) => { setIsMobileMenuOpen(false); handleDashboardClick(e); }}
                      className="w-full bg-transparent border border-[#2c2c2c] text-white py-3 rounded-[8px] font-[500] text-[15px] flex items-center justify-center transition-colors hover:bg-white/5 h-[36px]"
                    >
                      Dashboard
                    </button>
                  </SignedIn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
