// @ts-nocheck
import ScrollFrames from "./components/ScrollFrames";
import { Navbar } from "./components/Navbar";

/**
 * The scaffold is deliberately EMPTY below the video.
 *
 * It used to seed Features / Story / Details / Footer in a fixed order. Every
 * site then arrived as those same four slots with the copy swapped, because a
 * concrete file in front of the model always beats an abstract instruction to
 * invent something. Compose the page from the Build Brief's sections instead:
 * create your own components, in your own order, with the shapes the brief's
 * layout concept calls for.
 */
export default function App() {
  return (
    <>
      <Navbar />

      {/* The cinematic scroll: the video scrubs for exactly this many viewports,
          one beat of copy on screen at a time, then the page continues below.
          Replace every beat below with the brief's copy — shipping these strings
          is a failed build. */}
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
        {/* Build the brief's sections here, as components you create. */}
      </main>
    </>
  );
}
