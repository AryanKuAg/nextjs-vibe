import type { NextConfig } from "next";

import { PREVIEW_HOST, previewHostPattern } from "./src/lib/preview-host";

// Node 22–25 exposes a sealed Proxy as global.localStorage during SSR.
// You cannot mutate its properties. Shadow the entire global with a safe no-op
// so libraries like next-themes and @clerk/nextjs don't crash on the server.
try {
  if (
    typeof global !== "undefined" &&
    global.localStorage !== undefined &&
    typeof global.localStorage.getItem !== "function"
  ) {
    const noopStorage = {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
      clear: () => { },
      key: () => null,
      length: 0,
    };
    Object.defineProperty(global, "localStorage", {
      value: noopStorage,
      writable: true,
      configurable: true,
    });
  }
} catch {
  // If even the defineProperty fails (e.g. non-configurable descriptor),
  // silently ignore — the page will still render via client-side hydration.
}

const nextConfig: NextConfig = {
  devIndicators: false,
  // A production build and a running `next dev` share `.next` and corrupt each
  // other — the build dies with "Cannot find module for page: /cookies" while
  // the dev server rewrites the manifest underneath it. Setting this lets a
  // build run beside a dev server instead of requiring you to stop yours.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Required for the Docker/Cloud Run image, which runs `node server.js` from
  // `.next/standalone`. Vercel builds its own function bundles and does not use
  // this, so it is left off there rather than producing an output tree nothing
  // reads. VERCEL=1 is set by the platform at build and at runtime.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ["inngest", "@inngest/agent-kit", "@e2b/code-interpreter"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "assets.framerate.space",
      },
    ],
  },
  async redirects() {
    // The path proxy needs a full navigation out of a preview sent back under
    // its prefix. On a dedicated host there is no prefix and nothing to send
    // back, so the rule only exists in fallback mode.
    if (PREVIEW_HOST) return [];

    return [
      {
        source: "/:path((?!api/v0-preview).*)",
        has: [
          {
            type: "header",
            key: "referer",
            value: ".*/api/v0-preview/(?<previewChatId>[^/?#]+).*",
          },
          { type: "header", key: "sec-fetch-dest", value: "(?:document|iframe)" },
        ],
        destination: "/api/v0-preview/:previewChatId/:path",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        /**
         * This app must never render inside a frame — and specifically not
         * inside the preview frame, where it once did. A link in a generated
         * site pointing at `/` escaped the proxy and loaded Framerate into the
         * builder's own preview pane, so the user was looking at our product
         * dressed up as their website.
         *
         * The proxy route is excluded because that IS the frame's content.
         */
        source: "/:path((?!api/v0-preview).*)",
        // Headers are applied before rewrites, so on the preview host this
        // would land on the site itself and stop the builder framing it.
        ...(PREVIEW_HOST
          ? { missing: [{ type: "host" as const, value: previewHostPattern() }] }
          : {}),
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
