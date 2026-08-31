// @ts-ignore
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';

export default function ScrollFrames() {
  return (
    <>
      {/* ScrollyVideo renders a position:sticky container that occupies 100vh of
          document flow. Without the negative bottom margin below, everything
          after <ScrollFrames /> would start one full viewport DOWN — the page
          would open on a bare video with the hero content hidden below the fold.
          The -100vh margin pulls the page content up so it overlays the pinned
          video from the very first viewport, while the sticky scrubbing keeps
          working (the container keeps its own 100vh box).
          Selectors are scoped to the library's data attribute so they never
          affect any other canvas/video on the page. */}
      <style>{`
        div[data-scrolly-container] {
          margin-bottom: -100vh !important;
        }
        div[data-scrolly-container] canvas,
        div[data-scrolly-container] video {
          object-fit: cover !important;
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
      <ScrollyVideo src="VIDEO_URL_HERE" />
    </>
  );
}
