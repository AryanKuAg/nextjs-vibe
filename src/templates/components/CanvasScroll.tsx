// @ts-nocheck
import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { TOTAL_FRAMES } from "../constants/frames";

export function CanvasScroll() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useStore((state: any) => state.images);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      let fraction = maxScroll > 0 ? scrollY / maxScroll : 0;
      fraction = Math.max(0, Math.min(1, fraction));

      const frameIndex = Math.floor(fraction * (TOTAL_FRAMES - 1));
      const img = images[frameIndex];

      if (img && img.complete && img.naturalWidth !== 0) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let renderWidth, renderHeight, offsetX, offsetY;

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

    renderFrame();

    const handleScroll = () => requestAnimationFrame(renderFrame);
    const handleResize = () => requestAnimationFrame(renderFrame);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [images]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-screen h-screen object-cover -z-10 pointer-events-none"
    />
  );
}
