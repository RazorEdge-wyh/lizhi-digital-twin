import { useEffect, useState } from "react";

/**
 * Background media for the landing screen.
 *
 * Three rules drive this component:
 *
 * 1. **The poster is a real <img>, not the video's `poster` attribute.** An
 *    image can be swapped per breakpoint with CSS, and it is what a reduced
 *    motion visitor, a phone on a metered connection, or a browser that cannot
 *    decode WebM actually sees.
 * 2. **The video is mounted only when it is worth its bytes** — a viewport at
 *    least 768px wide, a hover-capable fine pointer, and no
 *    `prefers-reduced-motion: reduce`. `<source media="…">` cannot express
 *    this: the `media` attribute is not honoured on `<video>/<source>`, so a
 *    rule written that way still pulls the full file on mobile. Only
 *    conditional mounting avoids the download.
 * 3. **Nothing ever renders as a broken image.** `<picture>` falls back to its
 *    `<img>` only on a `type`/`media` mismatch — a 404 fires `error` instead and
 *    the element stays broken. So the built-in SVG poster is the base layer and
 *    a real photo is layered over it only after it has actually been fetchable.
 *
 * Drop your files in `public/assets/` with these names and they take over
 * automatically:
 *
 *     bg.webm          the loop (8 MB is fine for a landing screen)
 *     bg-poster.jpg    desktop still, >= 1920x1080
 *     bg-mobile.jpg    phone still, portrait-friendly
 *
 * Paths are relative `./assets/…` document URLs. Because the bundler copies
 * `public/` verbatim, they resolve on a domain root *and* on a GitHub Pages
 * project sub-path (`/<repo>/`) without any base handling.
 */

/** Below this width the still poster is used instead of the video. */
const VIDEO_MIN_WIDTH = 768;

type Probe = "checking" | "ready" | "missing";

/** Is this file actually deployed? One HEAD request, no console noise. */
function useAvailable(url: string, enabled: boolean): Probe {
  const [state, setState] = useState<Probe>(enabled ? "checking" : "missing");

  useEffect(() => {
    if (!enabled) {
      setState("missing");
      return;
    }
    let alive = true;
    const controller = new AbortController();
    fetch(url, { method: "HEAD", signal: controller.signal })
      .then((res) => {
        // some static hosts answer 405 for HEAD; only a definite 404 counts out
        if (alive) setState(res.ok || res.status === 405 ? "ready" : "missing");
      })
      .catch(() => {
        if (alive) setState("missing");
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [url, enabled]);

  return state;
}

/** Breakpoint watcher: the still and the video switch on the same threshold. */
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(min-width: ${VIDEO_MIN_WIDTH}px)`);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/** Motion preference: used for the video only, the still is always allowed. */
function useMotionAllowed() {
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const sync = () => setAllowed(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return allowed;
}

export function MediaBackdrop() {
  const wide = useIsWide();
  const motionAllowed = useMotionAllowed();

  const desktopPoster = useAvailable("./assets/bg-poster.jpg", wide);
  const mobilePoster = useAvailable("./assets/bg-mobile.jpg", !wide);
  const canPlayVideo = wide && motionAllowed;
  const video = useAvailable("./assets/bg.webm", canPlayVideo);

  const posterSrc = wide ? desktopPoster : mobilePoster;
  const showPhoto = posterSrc === "ready";
  const showVideo = canPlayVideo && video === "ready";

  return (
    <div className="bgmedia" aria-hidden="true">
      {/* base layer: the committed SVG poster, always valid */}
      <img className="bgmedia__media" src="./assets/bg-poster.svg" alt="" decoding="async" fetchPriority="high" />
      {showPhoto && (
        <img
          className="bgmedia__media bgmedia__photo"
          src={wide ? "./assets/bg-poster.jpg" : "./assets/bg-mobile.jpg"}
          alt=""
          decoding="async"
        />
      )}

      {showVideo && (
        <video
          className="bgmedia__media bgmedia__video"
          // `muted` + `playsInline` are what allow autoplay on iOS Safari and
          // the mobile Chrome family; without either one playback is refused.
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="./assets/bg-poster.jpg"
          disablePictureInPicture
        >
          <source src="./assets/bg.webm" type="video/webm" />
        </video>
      )}
    </div>
  );
}
