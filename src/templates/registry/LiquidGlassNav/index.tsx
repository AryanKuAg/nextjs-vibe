import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  logoText: string;
  links: { label: string; href: string }[];
}

export function LiquidGlassNav({ logoText, links }: Props) {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-5xl rounded-full"
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 40px rgba(0,0,0,0.15)"
      }}
    >
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="text-xl font-medium tracking-tight text-white">{logoText}</div>
        <div className="hidden md:flex items-center gap-8">
          {links.map((link, i) => (
            <a key={i} href={link.href} className="text-sm text-white/80 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <button className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform">
          Get Started
        </button>
      </div>
    </motion.nav>
  );
}
