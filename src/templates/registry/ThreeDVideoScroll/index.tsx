import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ThreeDVideoScrollProps {
  /**
   * The total number of frames in the sequence.
   */
  totalFrames: number;
  /**
   * A function that takes a frame index (1-indexed) and returns the URL for that frame image.
   * Example: (index) => \`/assets/frames/\${String(index).padStart(3, "0")}.jpg\`
   */
  getFrameUrl: (index: number) => string;
  /**
   * Whether to show the built-in full-screen preloader overlay while downloading images.
   * Default is true.
   */
  showPreloader?: boolean;
}

export function ThreeDVideoScroll({
  totalFrames,
  getFrameUrl,
  showPreloader = true,
}: ThreeDVideoScrollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Local state for image loading
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Preload Images
  useEffect(() => {
    let mounted = true;
    
    // Prevent scrolling while loading
    if (showPreloader) {
      document.body.style.overflow = "hidden";
    }

    let count = 0;
    const loadedImages: HTMLImageElement[] = new Array(totalFrames);

    const completeLoading = () => {
      if (!mounted) return;
      setImages(loadedImages);
      // Slight delay for aesthetic transition
      setTimeout(() => {
        if (!mounted) return;
        setIsReady(true);
        if (showPreloader) {
          document.body.style.overflow = "";
        }
      }, 600);
    };

    const handleLoad = () => {
      count++;
      if (!mounted) return;
      setLoadedCount(count);
      if (count === totalFrames) {
        completeLoading();
      }
    };

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = handleLoad;
      img.onerror = handleLoad;
      loadedImages[i - 1] = img;
    }

    // Safety timeout: if it takes longer than 30s, force complete
    const timeout = setTimeout(() => {
      if (count < totalFrames) {
        completeLoading();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      document.body.style.overflow = "";
    };
  }, [totalFrames, getFrameUrl, showPreloader]);

  // Canvas Drawing & Scroll Logic
  useEffect(() => {
    if (!isReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      // Calculate scroll fraction based on body height vs window height
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      let fraction = maxScroll > 0 ? scrollY / maxScroll : 0;
      fraction = Math.max(0, Math.min(1, fraction)); // Clamp between 0 and 1

      // Map fraction to frame index
      const frameIndex = Math.floor(fraction * (totalFrames - 1));
      const img = images[frameIndex];

      if (img && img.complete && img.naturalWidth !== 0) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let renderWidth, renderHeight, offsetX, offsetY;

        // Cover the canvas (like object-fit: cover)
        if (imgRatio > canvasRatio) {
          renderHeight = canvas.height;
          renderWidth = canvas.height * imgRatio;
          offsetX = (canvas.width - renderWidth) / 2;
          offsetY = 0;
        } else {
          renderWidth = canvas.width;
          renderHeight = canvas.width / imgRatio;
          offsetX = 0;
          offsetY = (canvas.height - renderHeight) / 2;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
      }
    };

    // Initial render
    renderFrame();

    const handleScroll = () => requestAnimationFrame(renderFrame);
    const handleResize = () => requestAnimationFrame(renderFrame);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [images, isReady, totalFrames]);

  const percentage = Math.min(100, Math.floor((loadedCount / totalFrames) * 100));

  return (
    <>
      {/* Preloader Overlay */}
      {showPreloader && (
        <AnimatePresence>
          {!isReady && (
            <motion.div
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" } as any}
              className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white"
            >
              <div className="text-4xl md:text-5xl font-serif font-light tracking-tighter tabular-nums mb-6">
                {percentage}%
              </div>

              <div className="w-64 max-w-[80vw] flex flex-col items-center gap-3">
                <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.1 } as any}
                  />
                </div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-sans text-center">
                  Loading all frames {loadedCount} / {totalFrames} — full scroll unlocks at 100%
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Background Canvas */}
      <div className={`relative w-full transition-opacity duration-1000 ${isReady ? "opacity-100" : "opacity-0"}`}>
        <canvas
          ref={canvasRef}
          className="fixed top-0 left-0 w-screen h-screen object-cover -z-10 pointer-events-none"
        />
      </div>
    </>
  );
}
