// @ts-nocheck
import { motion, MotionValue, useTransform } from "framer-motion";

export function Hero({ progress }: { progress?: MotionValue<number> }) {
  // If progress is passed, use it, otherwise fallback to static 1 opacity
  const opacity = progress ? useTransform(progress, [0, 0.1], [1, 0]) : 1;
  const pointerEvents = progress ? useTransform(progress, (v) => v < 0.1 ? "auto" : "none") : "auto";

  return (
    <motion.section 
      style={{ opacity, pointerEvents }}
      className="relative min-h-[100svh] w-full px-8 md:px-16 pb-20 flex flex-col justify-end"
    >
      <div className="w-full flex flex-col md:flex-row items-end justify-between gap-12">
        {/* Left Side: Description + CTA */}
        <div className="max-w-sm flex flex-col items-start text-left order-2 md:order-1">
          <p className="text-[11px] md:text-xs text-white/60 mb-6 leading-relaxed max-w-[300px] uppercase tracking-wider font-light">
            Experience the pinnacle of automotive engineering. Every component, every curve, designed for absolute speed and precision on the world's most demanding circuits.
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
