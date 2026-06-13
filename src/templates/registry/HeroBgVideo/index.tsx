import { useEffect, useRef } from "react";

const HERO_VIDEO_CACHE = "hero-video-cache-v1";

async function getCachedVideoSrc(videoUrl: string): Promise<string> {
  if (typeof window === 'undefined' || !("caches" in window)) return videoUrl;
  try {
    const cache = await caches.open(HERO_VIDEO_CACHE);
    const cached = await cache.match(videoUrl);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
    const response = await fetch(videoUrl);
    if (response.ok) {
      await cache.put(videoUrl, response.clone());
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch {/* fall through */}
  return videoUrl;
}

export interface HeroBgVideoProps {
  /**
   * The URL of the video to play in the background.
   */
  videoUrl: string;
  /**
   * The current scroll Y position (for parallax effect). Default is 0.
   */
  scrollY?: number;
  /**
   * How fast the video moves relative to scroll speed. Default is 0.25.
   */
  parallaxSpeed?: number;
  /**
   * Scale multiplier to ensure no edges show during parallax. Default is 1.08.
   */
  scale?: number;
  /**
   * Opacity of the video. Default is 1.
   */
  opacity?: number;
}

export function HeroBgVideo({ 
  videoUrl, 
  scrollY = 0, 
  parallaxSpeed = 0.25,
  scale = 1.08,
  opacity = 1
}: HeroBgVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!videoUrl) return;
    
    getCachedVideoSrc(videoUrl).then((src) => {
      if (!mounted || !videoRef.current) return;
      if (src.startsWith("blob:")) blobUrlRef.current = src;
      videoRef.current.src = src;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    });
    return () => {
      mounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity,
        transform: `translateY(${scrollY * parallaxSpeed}px) scale(${scale})`,
        transition: "transform 0.1s linear",
        pointerEvents: "none",
      }}
    />
  );
}
