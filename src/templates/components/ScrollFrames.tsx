// @ts-ignore
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';
import { useEffect, useRef, useState } from 'react';

/**
 * The full-page cinematic scroll track. Platform-owned — the code agent imports
 * it and passes copy, and never edits this file.
 *
 * HOW THE SCRUB RANGE WORKS (do not "simplify" this away):
 * scrolly-video computes its progress as
 *
 *     scrollPercent = -container.parentNode.top / (parentNode.height - innerHeight)
 *
 * so the PARENT of its container is the scrub track. Giving that parent an
 * explicit height is what makes the video start and, crucially, FINISH at a
 * known point instead of scrubbing across the whole document. The track is
 * (beats + 1) x 100vh, which leaves exactly `beats` viewports of scroll range.
 *
 * Everything rendered after <ScrollFrames /> therefore begins after the video
 * has played out, as ordinary page flow.
 *
 * The beats cross-fade in place at the bottom-left so the frame stays open and
 * the viewer can actually watch the scene. One beat is on screen at a time.
 */

export interface ScrollBeat {
  /** Short line, 2-6 words. No numbering, no eyebrow labels. */
  headline: string;
  /** One or two sentences at most. */
  body: string;
}

interface ScrollFramesProps {
  beats?: ScrollBeat[];
  /** Rendered under the first beat only. */
  cta?: { label: string; href: string };
  /** Matches the Build Brief's text scheme over the video. */
  tone?: 'light' | 'dark';
}

/** Share of each beat's slot spent fading in, and again fading out. */
const FADE = 0.22;

/**
 * Scroll distance each beat occupies, as a share of the viewport.
 *
 * This is the scrub SPEED dial. The video is spread across
 * `beats x BEAT_SCROLL_VH` of scrolling, so a smaller number means more video
 * per wheel notch. A full viewport per beat made the video crawl — you scrolled
 * a whole screen to move a third of the way through an 8 second clip. At 0.6
 * the whole video passes in under two screens of scroll, which is the
 * QuickTime-scrubber feel, while each beat still holds long enough to read.
 */
const BEAT_SCROLL_VH = 0.9;

export default function ScrollFrames({ beats = [], cta, tone = 'light' }: ScrollFramesProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // At least one slot even if no beats were supplied, so the track still has a
  // viewport of scroll and the video is never skipped entirely.
  const count = Math.max(beats.length, 1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Read synchronously rather than inside requestAnimationFrame. One
    // getBoundingClientRect is cheap and React batches the state update, whereas
    // rAF gets starved for seconds while scrolly-video decodes the video — which
    // leaves the beats frozen on whatever the last painted frame said.
    const read = () => {
      const rect = track.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const next = range > 0 ? -rect.top / range : 0;
      setProgress(next < 0 ? 0 : next > 1 ? 1 : next);
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  const opacityFor = (index: number) => {
    const local = progress * count - index; // 0..1 within this beat's slot
    // The opening beat is already on screen when the page loads, so it holds at
    // full opacity through its own fade-in window. Without this it is invisible
    // at progress 0 and the site opens on an empty frame.
    if (index === 0 && local < FADE) return 1;
    if (local <= 0 || local >= 1) return 0;
    if (local < FADE) return local / FADE;
    if (local > 1 - FADE) return (1 - local) / FADE;
    return 1;
  };

  const text = tone === 'dark' ? '#18181b' : '#ffffff';
  const secondary = tone === 'dark' ? 'rgba(24,24,27,0.8)' : 'rgba(255,255,255,0.85)';

  return (
    // Height = one pinned viewport + the scrub range. scrolly-video divides by
    // (trackHeight - viewportHeight), so the range is exactly the second term.
    <div ref={trackRef} style={{ position: 'relative', height: `${100 + count * BEAT_SCROLL_VH * 100}vh` }}>
      {/* Scoped to the library's own attribute so no other video on the page is
          affected. The container is sticky and 100vh; the canvas has to cover it. */}
      <style>{`
        div[data-scrolly-container] canvas,
        div[data-scrolly-container] video {
          object-fit: cover !important;
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>

      <ScrollyVideo src="VIDEO_URL_HERE" />

      {/* Pulled back over the video: both are sticky children of the track, so
          without the negative margin this layer would not pin until a full
          viewport of scroll had passed. */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          marginTop: '-100vh',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {beats.map((beat, index) => {
          const opacity = opacityFor(index);
          return (
            <div
              key={index}
              className="absolute bottom-0 left-0 w-full max-w-[36rem] px-6 pb-16 md:px-14 md:pb-20"
              style={{
                opacity,
                transform: `translateY(${(1 - opacity) * 14}px)`,
                // Nothing invisible should swallow a click.
                pointerEvents: opacity > 0.5 ? 'auto' : 'none',
                willChange: 'opacity, transform',
              }}
            >
              <h2
                className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.08]"
                style={{ color: text }}
              >
                {beat.headline}
              </h2>
              <p
                className="mt-4 text-base md:text-lg leading-relaxed max-w-[34rem]"
                style={{ color: secondary }}
              >
                {beat.body}
              </p>
              {index === 0 && cta ? (
                <a
                  href={cta.href}
                  className="mt-7 inline-block border px-6 py-3 text-sm font-medium tracking-wide transition-colors"
                  style={{ color: text, borderColor: text }}
                >
                  {cta.label}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
