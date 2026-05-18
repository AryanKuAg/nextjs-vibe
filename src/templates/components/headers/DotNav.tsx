// @ts-nocheck
import { useEffect, useState } from "react";
import { useScroll } from "framer-motion";

export function DotNav() {
  const { scrollYProgress } = useScroll();
  const [active, setActive] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (v: any) => {
      const index = Math.min(4, Math.max(0, Math.round(v * 4)));
      setActive(index);
    });
  }, [scrollYProgress]);

  const scrollToSection = (index: number) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = maxScroll * (index / 4);
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
      {[0, 1, 2, 3, 4].map((index) => (
        <button
          key={index}
          onClick={() => scrollToSection(index)}
          className={`rounded-full transition-all duration-300 ${
            active === index
              ? "w-2 h-2 bg-white scale-125"
              : "w-1 h-1 bg-white/20 hover:bg-white/50"
          }`}
          aria-label={`Scroll to section ${index + 1}`}
        />
      ))}
    </div>
  );
}
