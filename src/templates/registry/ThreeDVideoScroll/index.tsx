import React, { useRef, useEffect, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

interface Props {
  videoUrl: string;
  children: React.ReactNode;
}

export function ThreeDVideoScroll({ videoUrl, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(1);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          setDuration(videoRef.current.duration || 1);
        }
      };
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [videoUrl]);

  useEffect(() => {
    return scrollYProgress.on("change", (latest: number) => {
      if (videoRef.current && duration > 0) {
        // use requestAnimationFrame for smoother scrubbing if needed
        videoRef.current.currentTime = latest * duration;
      }
    });
  }, [scrollYProgress, duration]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden z-0">
        <video 
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
      </div>
      <div className="relative z-20 -mt-[100vh]">
        {children}
      </div>
    </div>
  );
}
