// @ts-nocheck
import ScrollFrames from "./components/ScrollFrames";
import { Navbar } from "./components/Navbar";

import { Features } from "./components/sections/Features";
import { Story } from "./components/sections/Story";
import { Details } from "./components/sections/Details";
import { Footer } from "./components/sections/Footer";

export default function App() {
  return (
    <>
      <Navbar />

      {/* The cinematic scroll: the video scrubs for exactly this many viewports,
          one beat of copy on screen at a time, then the page continues below. */}
      <ScrollFrames
        tone="light"
        cta={{ label: "Replace me", href: "#story" }}
        beats={[
          { headline: "Replace this headline", body: "One or two sentences of real copy. Keep it short: the point is the view behind it." },
          { headline: "Second beat", body: "A different angle on the same story, still concrete." },
          { headline: "Third beat", body: "The last thing worth saying before the page proper begins." },
        ]}
      />

      <main className="w-full relative z-10 flex flex-col">
        <Features />
        <Story />
        <Details />
        <Footer />
      </main>
    </>
  );
}
