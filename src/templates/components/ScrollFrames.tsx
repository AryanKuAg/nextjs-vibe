// @ts-ignore
import ScrollyVideo from 'scrolly-video/dist/ScrollyVideo.esm.jsx';
import { useEffect, useRef } from 'react';

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
 *
 * WHY THERE IS NO REACT STATE HERE (do not add any):
 * Scrubbing already saturates the main thread — scrolly-video seeks and decodes
 * a frame for every scroll tick. This component must therefore add as close to
 * nothing as possible on the scroll path. Driving the beats through `useState`
 * meant a full re-render of this subtree — including <ScrollyVideo> — on every
 * single scroll event, which is the most expensive possible way to change an
 * opacity. Beat styles are now written straight to the DOM through refs, so the
 * component renders exactly once and the video element is never reconciled.
 *
 * The scroll handler stays SYNCHRONOUS rather than moving into
 * requestAnimationFrame: rAF callbacks get starved for seconds while
 * scrolly-video decodes, which leaves the beats frozen on whatever the last
 * painted frame said. Synchronous writes are correct here precisely because
 * they are now cheap — a few style assignments, no React, no layout read.
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

/** Opacity of one beat at a given track progress. Pure, so it can live outside. */
const opacityFor = (progress: number, index: number, count: number) => {
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

export default function ScrollFrames({ beats = [], cta, tone = 'light' }: ScrollFramesProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  // At least one slot even if no beats were supplied, so the track still has a
  // viewport of scroll and the video is never skipped entirely.
  const count = Math.max(beats.length, 1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Track geometry is measured out-of-band instead of per scroll event.
    // getBoundingClientRect forces a synchronous layout, and calling it on the
    // scroll path while scrolly-video is mutating its canvas means paying a
    // reflow for every tick. The track's position only changes when the page
    // actually resizes or reflows, so that is when it is re-measured.
    let trackTop = 0;
    let range = 0;

    const measure = () => {
      const rect = track.getBoundingClientRect();
      trackTop = rect.top + window.scrollY;
      range = rect.height - window.innerHeight;
    };

    const paint = () => {
      const p = range > 0 ? (window.scrollY - trackTop) / range : 0;
      const progress = p < 0 ? 0 : p > 1 ? 1 : p;

      for (let index = 0; index < beatRefs.current.length; index += 1) {
        const el = beatRefs.current[index];
        if (!el) continue;
        const opacity = opacityFor(progress, index, count);
        el.style.opacity = String(opacity);
        el.style.transform = `translateY(${(1 - opacity) * 14}px)`;
        // Nothing invisible should swallow a click.
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      }
    };

    const remeasure = () => {
      measure();
      paint();
    };

    remeasure();

    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', remeasure);

    // Anything above the track loading late (images, webfonts) shifts trackTop,
    // and the track's own vh height changes with the viewport. Both would leave
    // the cached geometry stale and desync the beats from the video.
    const observer = new ResizeObserver(remeasure);
    observer.observe(document.body);
    observer.observe(track);

    return () => {
      window.removeEventListener('scroll', paint);
      window.removeEventListener('resize', remeasure);
      observer.disconnect();
    };
  }, [count]);

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
        {beats.map((beat, index) => (
          <div
            key={index}
            ref={(el) => {
              beatRefs.current[index] = el;
            }}
            className="absolute bottom-0 left-0 w-full max-w-[36rem] px-6 pb-16 md:px-14 md:pb-20"
            style={{
              // First paint only — the effect takes over on mount. The opening
              // beat must be visible before any scroll happens.
              opacity: index === 0 ? 1 : 0,
              transform: 'translateY(0px)',
              pointerEvents: index === 0 ? 'auto' : 'none',
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
        ))}
      </div>
    </div>
  );
}
