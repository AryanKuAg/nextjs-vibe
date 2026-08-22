import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { ClerkProvider, SignedOut } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inconsolata, DM_Mono, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";

import { GoogleOneTap } from "@/components/google-one-tap";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";
import { CanonicalUrl } from "@/components/canonical-url";

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

const stackSansNotch = localFont({
  src: "../fonts/StackSansNotch-VF.woff2",
  variable: "--font-stack-sans-notch",
  display: "swap",
});


const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: "400", // Using a single weight string instead of array
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Framerate — Create & Export Full 3D Websites with AI",
  description: "Just describe your vision to create, preview, and export a full 3D website instantly. Build with Framerate's AI and 3D scroll library.",
  metadataBase: new URL("https://framerate.space"),
  openGraph: {
    type: "website",
    url: "https://framerate.space/",
    title: "Framerate — Create & Export Full 3D Websites with AI",
    description: "Just describe your vision to create, preview, and export a full 3D website instantly. Build with Framerate's AI and 3D scroll library.",
    siteName: "Framerate",
    images: [
      {
        url: "/social_preview.png",
        width: 2400,
        height: 1260,
        alt: "Framerate — Create & Export Full 3D Websites with AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Framerate — Create & Export Full 3D Websites with AI",
    description: "Just describe your vision to create, preview, and export a full 3D website instantly. Build with Framerate's AI and 3D scroll library.",
    images: ["/social_preview.png"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
            <link rel="stylesheet" href="https://use.typekit.net/xvp3dbf.css" />
          </head>
          <body
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} ${inconsolata.variable} ${stackSansNotch.variable} ${dmMono.variable} ${spaceGrotesk.variable} antialiased`}
          >
            <CanonicalUrl />
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
            <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
            <Script
              id="fb-pixel"
              strategy="lazyOnload"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', 'YOUR_PIXEL_ID_HERE');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img height="1" width="1" style={{ display: "none" }} src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1" alt="" />
            </noscript>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
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
