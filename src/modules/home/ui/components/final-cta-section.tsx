"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SignedIn, SignedOut, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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
        } catch (e) {
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
            className="bg-white text-black px-3 py-2 rounded-[8px] font-[500] text-sm flex items-center gap-2 disabled:opacity-70 transition-opacity"
        >
            {isPending ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
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

export const FinalCTASection = () => {
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const createProject = useMutation(
        trpc.projects.create.mutationOptions({
            onSuccess: (data) => {
                queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
                queryClient.invalidateQueries(trpc.usage.status.queryOptions());
                router.push(`/projects/${data.id}`);
            },
        })
    );

    const handleStartBuilding = async () => {
        await createProject.mutateAsync({ value: "" });
    };

    const isPending = createProject.isPending;

    return (
        <section className="py-20 px-6 flex flex-col items-center text-center font-inconsolata">
            <h2 className="text-3xl md:text-[40px] leading-[40px] text-white mb-3 font-[500]">Ready to build your first 3D site?</h2>
            <p className="text-sm text-neutral-400 mb-[40px]">Just describe your vision and watch it turn into a live, interactive experience in few minutes.</p>
            <div className="flex gap-2">
                <SignedOut>
                    <GoogleSignInButton />
                </SignedOut>
                <SignedIn>
                    <button
                        onClick={handleStartBuilding}
                        disabled={isPending}
                        className="px-3 py-2 bg-white text-black text-sm font-[500] rounded-[8px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? "Starting..." : "Start building"}
                    </button>
                </SignedIn>
            </div>
        </section>
    );
};
