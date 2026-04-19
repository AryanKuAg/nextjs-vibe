import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inconsolata, DM_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { GoogleOneTap } from "@/components/google-one-tap";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Framerate – Build 3D Websites with AI",
  description: "Turn ideas into stunning 3D websites instantly. Design, animate, and launch with AI in a seamless workflow.",
  metadataBase: new URL("https://www.framerate.space"),
  openGraph: {
    type: "website",
    url: "https://www.framerate.space/",
    title: "Framerate – Build 3D Websites with AI",
    description: "Turn ideas into stunning 3D websites instantly. Design, animate, and launch with AI in a seamless workflow.",
    siteName: "Framerate",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Framerate – Build 3D Websites with AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Framerate – Build 3D Websites with AI",
    description: "Turn ideas into stunning 3D websites instantly. Design, animate, and launch with AI in a seamless workflow.",
    images: ["/og-image.png"],
  },
  other: {
    "google-site-verification": "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#C96342",
        },
      }}
    >
      <TRPCReactProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} ${inconsolata.variable} ${dmMono.variable} ${spaceGrotesk.variable} antialiased`}
          >
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=G-EDJCD5QD81`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  gtag('config', 'G-EDJCD5QD81');
                `,
              }}
            />
            <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
              <SignedIn>
                {/* Regular content */}
              </SignedIn>
              <SignedOut>
                <GoogleOneTap />
              </SignedOut>
              <div id="clerk-captcha"></div>
              {children}
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
