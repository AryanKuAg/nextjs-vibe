import type { NextConfig } from "next";

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
  output: "standalone", // Required for Docker/Cloud Run deployment
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "inngest", "@inngest/agent-kit", "@e2b/code-interpreter"],
  outputFileTracingIncludes: {
    "/api/extract-frames": ["./node_modules/ffmpeg-static/**/*"],
    // The code agent seeds every new sandbox from src/templates, reading it at
    // runtime with fs via a path built from process.cwd(). Next cannot trace a
    // dynamic read like that, so without this the standalone output ships without
    // the scaffold: hydration silently writes nothing, the base image's App.tsx
    // is left importing a ScrollFrames component that was never created, and the
    // Vite build fails with "Could not resolve ./components/ScrollFrames".
    "/api/inngest": ["./src/templates/**/*"],
  },
  images: {
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
  async rewrites() {
    return {
      /**
       * Routes a hosted preview's own requests to the preview proxy.
       *
       * The site v0 hosts emits root-relative URLs — its HTML asks for
       * `/_next/static/...` and its runtime builds more of those after load.
       * Inside our same-origin iframe those resolve against this app, where
       * `/_next` is ours, so the preview would load its document and then fail
       * to fetch a single chunk. Rewriting the HTML cannot fix it, because the
       * URLs that matter are constructed in JavaScript.
       *
       * The requests are identified by where they came from: a same-origin
       * iframe sends the full document URL as `Referer`, so anything refered
       * from `/api/v0-preview/:chatId` is the preview asking for one of its own
       * files. `beforeFiles` is what makes this work at all — it runs ahead of
       * the filesystem, so it can claim `/_next/*` before Next serves our copy.
       *
       * This lived in middleware first, which was wrong twice over: middleware
       * does not run for `/_next/*` under the matcher, and short-circuiting it
       * to add coverage skipped Clerk and turned every 404 into a 500.
       */
      beforeFiles: [
        {
          source: "/:path((?!api/v0-preview).*)",
          has: [
            {
              type: "header",
              key: "referer",
              value: ".*/api/v0-preview/(?<previewChatId>[^/?#]+).*",
            },
          ],
          destination: "/api/v0-preview/:previewChatId/:path",
        },
      ],
      afterFiles: [
        {
          source: "/proxy-r2/:path*",
          destination: "https://assets.framerate.space/:path*",
        },
      ],
    };
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
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
