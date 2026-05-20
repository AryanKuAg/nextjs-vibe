// @ts-nocheck
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { TOTAL_FRAMES } from "../constants/frames";

export function Preloader() {
  const { loadedCount, isReady, setLoadedCount, setIsReady, setImages } = useStore();

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    let count = 0;
    const loadedImages: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    const completeLoading = () => {
      setImages(loadedImages);
      setTimeout(() => {
        setIsReady(true);
        document.body.style.overflow = '';
      }, 600);
    };

    const handleLoad = () => {
      count++;
      setLoadedCount(count);
      if (count === TOTAL_FRAMES) {
        completeLoading();
      }
    };

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(4, "0");
      img.src = `./frame-${paddedIndex}.jpg`;
      img.onload = handleLoad;
      img.onerror = handleLoad;
      loadedImages[i - 1] = img;
    }

    const timeout = setTimeout(() => {
      if (count < TOTAL_FRAMES) {
        completeLoading();
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [setLoadedCount, setIsReady, setImages]);

  const percentage = Math.min(100, Math.floor((loadedCount / TOTAL_FRAMES) * 100));

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
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
                transition={{ duration: 0.1 }}
              />
            </div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-sans text-center">
              Loading all frames {loadedCount} / {TOTAL_FRAMES} — full scroll unlocks at 100%
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
