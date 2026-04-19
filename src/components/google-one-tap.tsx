"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export const GoogleOneTap = () => {
  const { isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    // Silence noisy Google GSI errors that aren't actual bugs
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args[0];
      if (typeof msg === "string" && msg.includes("[GSI_LOGGER]") && (msg.includes("AbortError") || msg.includes("NetworkError") || msg.includes("FedCM") || msg.includes("origin is not allowed"))) {
        return;
      }
      originalError.apply(console, args);
    };

    if (!isLoaded || isSignedIn) {
      return () => {
        console.error = originalError;
      };
    }

    // Use a global variable to ensure we only prompt once per window lifetime
    if (window._googleOneTapPrompted) return;

    const initializeOneTap = () => {
      const google = window.google;
      if (!google || hasAutoSubmitted.current) return;

      window._googleOneTapPrompted = true;

      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        itp_support: true,
        use_fedcm_for_prompt: false,
        callback: async (response) => {
          if (hasAutoSubmitted.current) return;
          hasAutoSubmitted.current = true;

          try {
            const res = await clerk.authenticateWithGoogleOneTap({
              token: response.credential,
            });

            await clerk.handleGoogleOneTapCallback(res, {
              signInFallbackRedirectUrl: "/",
            });
          } catch (error) {
            console.error("One Tap authentication failed:", error);
            hasAutoSubmitted.current = false;
            window._googleOneTapPrompted = false;
          }
        },
      });

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.log("One Tap not displayed:", notification.getNotDisplayedReason());
          window._googleOneTapPrompted = false;
        } else if (notification.isSkippedMoment()) {
          console.log("One Tap skipped:", notification.getSkippedReason());
          window._googleOneTapPrompted = false;
        }
      });
    };

    const timer = setTimeout(initializeOneTap, 500);
    return () => {
      clearTimeout(timer);
      console.error = originalError;
      try {
        window.google?.accounts.id.cancel();
      } catch {
        // Ignore cancel errors
      }
    };
  }, [isLoaded, isSignedIn, clerk]);

  return null;
};
