---
id: "ThreeDVideoScroll"
description: "A highly immersive 3D scrolling experience that perfectly maps a high-frame-rate image sequence to the user's scroll position. Features an integrated preloader."
---

# ThreeDVideoScroll

This component renders an interactive, full-screen background video effect by drawing a sequence of pre-loaded images to a canvas. The currently displayed frame is strictly tied to the user's scroll position, allowing them to smoothly scrub back and forth through the video by scrolling the page.

It manages its own image downloading and features an elegant, dark-mode preloading screen to ensure a perfectly smooth playback experience.

## Usage
Place this component high up in your component tree (e.g. in your `App.tsx` or main layout). You must ensure your page has enough content (or an explicit height) so the user has room to scroll. The component automatically calculates the scrollable height and maps it to the total number of frames.

## Props
- \`totalFrames\` (number, required): The total number of frames in your image sequence.
- \`getFrameUrl\` ((index: number) => string, required): A function that takes a 1-indexed frame number and returns the URL for that image.
- \`showPreloader\` (boolean, optional): Whether to show the built-in full-screen loading overlay. Default is `true`.

## Usage Example
\`\`\`tsx
import { ThreeDVideoScroll } from "../../registry/ThreeDVideoScroll";

export function App() {
  return (
    <>
      {/* 
        The component is placed at the root. 
        It will render a fixed background canvas behind everything.
      */}
      <ThreeDVideoScroll 
        totalFrames={362}
        getFrameUrl={(index) => {
          // Format the URL. E.g. index 5 becomes "005.jpg"
          const paddedIndex = String(index).padStart(3, "0");
          return \`https://your-bucket.com/frames/\${paddedIndex}.jpg\`;
        }}
      />

      {/* Your Page Content */}
      <main className="relative z-10 text-white">
        {/* We make the main container very tall so we have plenty of room to scroll through the frames */}
        <div className="h-[500vh]">
          <h1 className="text-6xl pt-[50vh] text-center font-bold">
            Scroll Down
          </h1>
          
          <h2 className="text-4xl pt-[200vh] text-center">
            The background scrubs with you
          </h2>
        </div>
      </main>
    </>
  );
}
\`\`\`
