// @ts-ignore
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';

export default function ScrollFrames() {
  return (
    <>
      <style>{`
        canvas, video {
          object-fit: cover !important;
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
      <ScrollyVideo src="VIDEO_URL_HERE" />
    </>
  );
}
