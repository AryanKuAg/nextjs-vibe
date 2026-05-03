"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SignedIn, SignedOut, useUser, useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CustomSignInModal } from "@/components/custom-sign-in-modal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const GoogleSignInButton = () => {
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
      className="bg-white text-black px-3 py-2 pr-4 sm:pr-6 lg:pr-3 rounded-[8px] font-[500] text-sm flex  items-center gap-2 disabled:opacity-70 transition-opacity"
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

const UserAvatarButton = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  const initial = (user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase();
  const imageUrl = user?.imageUrl;

  return (
    <div

      className="flex items-center gap-2.5  transition-opacity group"
    >
      {/* Vertical divider */}
      <div className="w-px h-5 bg-[#3B3B38]" />
      {/* Avatar — profile photo or initial fallback */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={initial}
          width={28}
          height={28}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 ml-[10px]"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initial}
        </div>
      )}
      {/* Label */}
      <button onClick={() => signOut({ redirectUrl: "/" })} className="text-sm text-[#cccccc] group-hover:text-white transition-colors font-inconsolata mr-[10px]">Sign out</button>
    </div>
  );
};

export const PillNavbar = () => {
  const { user } = useUser();
  const router = useRouter();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
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

  const isPending = createProject.isPending;
  if (!isMounted) return null;

  return (
    <>
      <CustomSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10 w-full px-4  md:max-w-fit">
        <div className="flex items-center justify-between md:justify-normal md:gap-20 h-[52px] px-2 bg-neutral-900 rounded-[16px] font-inconsolata" style={{ boxShadow: "0 0 8px 0 rgba(0,0,0,0.25)" }}>
          {/* Left side: Logo */}
          <Link href="/" className="flex items-center gap-2 pl-2">
            <Image src="/logo.png" alt="framerate" width={24} height={24} />
            <span className="text-white font-[500] text-[16px]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>framerate</span>
          </Link>

          {/* Center: Links */}
          <div className="hidden md:flex items-center gap-4 text-white text-sm">
            <button
              onClick={handleDashboardClick}
              disabled={isPending}
              className="hover:text-[#CCCCCC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dashboard
            </button>
            <Link href="/pricing" className="">Pricing</Link>
            <Link href="mailto:teamframerate@gmail.com" className="">Contact</Link>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center h-[36px] text-nowrap">
            <SignedOut>
              <GoogleSignInButton />
            </SignedOut>
            <SignedIn>
              <UserAvatarButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </>
  );
};
