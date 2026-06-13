---
id: "HeroBgVideo"
description: "A cinematic background video component with client-side caching and scroll-based parallax. Used exclusively for full-bleed hero sections."
---

# HeroBgVideo
This component is used to render a cinematic background video. It implements an internal caching system using the browser's Cache API to prevent re-fetching the video on reload, and features a subtle parallax scrolling effect.

## Usage
Place this component absolutely inside a hero section or container that has `overflow: hidden` and `position: relative`.

## Props
- \`videoUrl\` (string, required): The URL of the video to play.
- \`scrollY\` (number, optional): The current `window.scrollY` value to drive the parallax effect. Pass this from a `window.addEventListener("scroll", ...)` in the parent component.
- \`parallaxSpeed\` (number, optional): Speed multiplier for the scroll effect. Default is `0.25`.
- \`scale\` (number, optional): Default is `1.08`. Keeps the video slightly scaled up so the edges don't show during parallax.
- \`opacity\` (number, optional): Default is `1`.

## Usage Example
\`\`\`tsx
import { useState, useEffect } from "react";
import { HeroBgVideo } from "../../registry/HeroBgVideo";

export function HeroSection() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative w-full h-screen min-h-[680px] overflow-hidden">
      {/* The background video */}
      <HeroBgVideo 
        videoUrl="https://example.com/cinematic_video.mp4" 
        scrollY={scrollY} 
      />

      {/* A dark vignette overlay for text readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Your Hero Content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white">
        <h1 className="text-6xl font-bold">Cinematic Experience</h1>
      </div>
    </section>
  );
}
\`\`\`
