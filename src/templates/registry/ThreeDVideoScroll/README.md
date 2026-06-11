---
id: "ThreeDVideoScroll"
description: "A full-page cinematic scrolling container that scrubs through a video based on scroll position. REQUIRED when a videoUrl is present."
---

# ThreeDVideoScroll
To use this component, import it and wrap your sections in it.

## Props
- \`videoUrl\` (string, required): The URL of the video to scrub.
- \`children\` (ReactNode): The text content or sections to overlay on top of the video.

## Usage Example
\`\`\`tsx
import { ThreeDVideoScroll } from "./components/ThreeDVideoScroll";

export default function App() {
  return (
    <ThreeDVideoScroll videoUrl="https://example.com/video.mp4">
      <section className="h-screen flex items-center">Hero Text</section>
    </ThreeDVideoScroll>
  );
}
\`\`\`
