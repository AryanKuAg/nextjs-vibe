"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
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
            className="pl-5 pr-6 py-4 bg-white text-black rounded-[12px] font-[500] text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity hover:bg-neutral-200"
        >
            {isPending ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-black shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Get started
                </>
            ) : (
                <>
                    <Image src="/google.svg" alt="Google" width={16} height={16} className="shrink-0" />
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

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const ctaContent = (
        <div className="w-full flex flex-col items-center text-center bg-transparent border border-[#333333] rounded-[24px] py-16 sm:py-24 px-6 ">
            <h2 className="text-3xl sm:text-[40px] leading-[1.1] text-white mb-4 font-stack-sans-notch font-[700] tracking-tight">
                Ready to build your<br className="hidden sm:block" /> first 3D site?
            </h2>
            <p className="text-sm text-[#737373] mb-10 font-sans font-[500] max-w-[500px]">
                Just describe your vision and watch it turn into a live, interactive experience in few minutes.
            </p>
            <div className="flex gap-2 min-h-[52px]">
                {!isMounted ? null : (
                    <>
                        <SignedOut>
                            <GoogleSignInButton />
                        </SignedOut>
                        <SignedIn>
                            <button
                                onClick={handleStartBuilding}
                                disabled={isPending}
                                className="pl-5 pr-6 py-4 bg-white text-black rounded-[12px] font-[500] text-[15px] flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity hover:bg-neutral-200"
                            >
                                {isPending ? "Starting..." : "Start building"}
                            </button>
                        </SignedIn>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
            {ctaContent}
        </section>
    );
};
