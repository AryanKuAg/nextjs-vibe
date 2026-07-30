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
    return [
      {
        source: "/proxy-r2/:path*",
        destination: "https://assets.framerate.space/:path*",
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
    ];
  },
};

export default nextConfig;
