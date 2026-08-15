// @ts-nocheck
import ScrollFrames from "./components/ScrollFrames";

/**
 * The scaffold is WIRING ONLY. There is no page here to refill.
 *
 * It used to seed a Navbar, four sections and a Footer. Every site then arrived
 * as those same slots with the copy swapped — same nav shape, same order, same
 * two-line footer — because a concrete file in front of the model always beats
 * an abstract instruction to invent something. ScrollFrames stays because it is
 * the platform's scrub track and must not be reimplemented. Everything else —
 * the navigation, the sections, the footer — you compose from the Build Brief.
 */
export default function App() {
  return (
    <>
      {/* Build the brief's navigation here, in the shape its nav concept describes. */}

      {/* The cinematic scroll: the video scrubs for exactly this many viewports,
          one beat of copy on screen at a time, then the page continues below.
          Replace every beat with the brief's copy and set `placement` from the
          brief's hero concept — shipping these strings is a failed build. */}
      <ScrollFrames
        tone="light"
        placement="bottom-left"
        cta={{ label: "Replace me", href: "#story" }}
        beats={[
          { headline: "Replace this headline", body: "One or two sentences of real copy. Keep it short: the point is the view behind it." },
          { headline: "Second beat", body: "A different angle on the same story, still concrete." },
          { headline: "Third beat", body: "The last thing worth saying before the page proper begins." },
        ]}
      />

      <main className="w-full relative z-10 flex flex-col">
        {/* Build the brief's sections and footer here, as components you create. */}
      </main>
    </>
  );
}
