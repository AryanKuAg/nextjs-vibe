import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inconsolata, DM_Mono, Space_Grotesk, Onest } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";

import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

import "./globals.css";

// Only Onest and Stack Sans Notch appear on public pages. The rest keep their
// @font-face rules for the screens that use them, but are not preloaded: seven
// preloaded font files on every page compete with the page's own content for
// the first round trips, and a font nothing renders is pure cost.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
  preload: false,
});

const stackSansNotch = localFont({
  src: "../fonts/StackSansNotch-VF.woff2",
  variable: "--font-stack-sans-notch",
  display: "swap",
});


const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: "400", // Using a single weight string instead of array
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  preload: false,
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Search Console offers the token in its DNS-record form too
 * ("google-site-verification=…"); the meta tag wants the bare token.
 */
const googleSiteVerification = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "")
  .replace(/^google-site-verification=/, "")
  .trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // No og:url here: a page without its own block would claim to be the
  // homepage. Public pages set theirs through pageMetadata().
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          <head>
            <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
            <link rel="stylesheet" href="https://use.typekit.net/xvp3dbf.css" />
          </head>
          <body
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} ${inconsolata.variable} ${stackSansNotch.variable} ${dmMono.variable} ${spaceGrotesk.variable} ${onest.variable} antialiased`}
          >
            {/* Revenue attribution. Sets the first-party cookie the checkout
                route forwards to Dodo as metadata, which is what ties a payment
                back to the visit that produced it. */}
            <Script
              src="https://datafa.st/js/script.js"
              data-website-id="dfid_sWZWVZNKhnn9GOFxqvu4y"
              data-domain="framerate.space"
              strategy="afterInteractive"
            />
            <Script
              strategy="lazyOnload"
              src={`https://www.googletagmanager.com/gtag/js?id=G-EDJCD5QD81`}
            />
            <Script
              id="google-analytics"
              strategy="lazyOnload"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  gtag('config', 'G-EDJCD5QD81');
                `,
              }}
            />
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
              <div id="clerk-captcha"></div>
              {children}
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
};
