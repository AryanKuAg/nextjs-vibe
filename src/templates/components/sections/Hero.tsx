// @ts-nocheck
import { motion, MotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

const HERO_VIDEO_URL =
  "https://storage.googleapis.com/sites.framerate.space/templates/hero_human_video_1.mp4";
const CACHE_NAME = "hero-video-cache-v1";

async function getCachedVideoSrc(): Promise<string> {
  if (!("caches" in window)) return HERO_VIDEO_URL;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(HERO_VIDEO_URL);
  if (cached) {
    const blob = await cached.blob();
    return URL.createObjectURL(blob);
  }
  const response = await fetch(HERO_VIDEO_URL);
  if (response.ok) {
    await cache.put(HERO_VIDEO_URL, response.clone());
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
  return HERO_VIDEO_URL;
}

export function Hero({ progress }: { progress?: MotionValue<number> }) {
  const opacity = progress ? useTransform(progress, [0, 0.1], [1, 0]) : 1;
  const pointerEvents = progress
    ? useTransform(progress, (v) => (v < 0.1 ? "auto" : "none"))
    : "auto";

  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getCachedVideoSrc().then((src) => {
      if (videoRef.current) {
        // Only revoke if it's a blob URL we created
        if (src.startsWith("blob:")) {
          objectUrl = src;
          blobUrlRef.current = src;
        }
        videoRef.current.src = src;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <motion.section
      style={{ opacity, pointerEvents }}
      className="relative min-h-[100svh] w-full px-8 md:px-16 pb-20 flex flex-col justify-end overflow-hidden"
    >
      {/* Looping video background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
      />

      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />

      <div className="w-full flex flex-col md:flex-row items-end justify-between gap-12">
        {/* Left Side: Description + CTA */}
        <div className="max-w-sm flex flex-col items-start text-left order-2 md:order-1">
          <p className="text-[11px] md:text-xs text-white/60 mb-6 leading-relaxed max-w-[300px] uppercase tracking-wider font-light">
            Experience the pinnacle of automotive engineering. Every component,
            every curve, designed for absolute speed and precision on the
            world's most demanding circuits.
          </p>
          <button className="px-8 py-3 bg-white text-black text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-white/90 transition-all duration-300">
            Explore the Grid
          </button>
        </div>

        {/* Right Side: Big Heading */}
        <div className="flex flex-col items-end text-right order-1 md:order-2">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-sans font-bold text-white tracking-tighter leading-[0.8] mb-2 uppercase">
            Speed.
          </h1>
          <p className="text-white/40 font-sans text-lg md:text-xl tracking-tight uppercase">
            Engineering the Pinnacle.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
