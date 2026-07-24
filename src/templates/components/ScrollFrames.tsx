// @ts-ignore
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';

export default function ScrollFrames() {
  return (
    <>
      {/* Scoped to the ScrollyVideo container (the first top-level div, since
          ScrollFrames must be App's first child) so it never affects other
          canvas/video elements added elsewhere on the page. */}
      <style>{`
        #root > div:first-of-type canvas,
        #root > div:first-of-type video {
          object-fit: cover !important;
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
      <ScrollyVideo src="VIDEO_URL_HERE" />
    </>
  );
}
