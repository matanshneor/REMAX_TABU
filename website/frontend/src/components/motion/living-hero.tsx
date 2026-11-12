"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef, useState } from "react";

/**
 * The home opening's photo, alive: the balloon leans slowly from side to side, as in a wind, and
 * the clouds drift (the owner's choice, 12.11.2026). It is the same photo cut into three layers
 * that sit exactly over it (public/hero): what is behind the balloon, the sky, and the balloon
 * itself down to its mouth. The basket, the people and the land stay the photo underneath.
 *
 * The photo itself loads first, as before. The layers are fetched only once the page has finished
 * loading, and they appear when all of them are ready, in the photo's own pose, so nothing jumps.
 * Visitors who asked their device for less motion, or to save data, keep the still photo and never
 * fetch the layers. The movement stops while the opening is off screen. Styles: globals.css (.living).
 */

/** A layer's place on the photo (2240 x 1493), in percent. The numbers come from cutting the photo. */
function place(left: number, top: number, width: number, height: number): CSSProperties {
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}
const BEHIND = place(8.6161, 6.7649, 42.0536, 75.9545);
const SKY = place(0.1339, 0, 99.7321, 60.0134);
const BALLOON = place(9.7768, 8.5064, 39.7321, 73.0743);
/** The middle of the balloon's mouth, in percent of the balloon layer: it leans around this point. */
const MOUTH = "50.169% 99.542%";

/** The photo is as wide as the screen or, on a tall screen, 1.5 times the frame's height
    (the whole screen; on a phone 72% of it). Each layer is its share of that. */
const SIZES = {
  behind: "(min-width: 768px) max(42vw, 63svh), max(42vw, 46svh)",
  sky: "(min-width: 768px) max(100vw, 150svh), max(100vw, 108svh)",
  balloon: "(min-width: 768px) max(40vw, 60svh), max(40vw, 43svh)",
};

const PARTS = ["behind", "sky", "sky-2", "balloon"] as const;
type Part = (typeof PARTS)[number];

export function LivingHero() {
  const root = useRef<HTMLDivElement>(null);
  const [wanted, setWanted] = useState(false);
  // The layers that have arrived; the photo comes alive when all of them have.
  const [ready, setReady] = useState<readonly Part[]>([]);
  const live = ready.length === PARTS.length;
  const loaded = (part: Part) => setReady((r) => (r.includes(part) ? r : [...r, part]));

  // Ask for the layers once the page itself has finished loading.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    let timer = 0;
    const begin = () => {
      timer = window.setTimeout(() => setWanted(true), 300);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    return () => {
      window.removeEventListener("load", begin);
      window.clearTimeout(timer);
    };
  }, []);

  // Nothing moves while the opening is off screen.
  useEffect(() => {
    const el = root.current;
    if (!el || !live) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  return (
    <div ref={root} aria-hidden="true" data-live={live ? "" : undefined} className="living absolute inset-0 overflow-hidden">
      {wanted && (
        <div className="living-stage">
          <div className="absolute" style={BEHIND}>
            <Image src="/hero/behind.webp" alt="" fill loading="eager" fetchPriority="low" sizes={SIZES.behind} onLoad={() => loaded("behind")} />
          </div>
          {/* The sky twice: each copy slides a little and fades, half a turn apart (see globals.css). */}
          <div className="absolute" style={SKY}>
            <Image src="/hero/sky.webp" alt="" fill loading="eager" fetchPriority="low" sizes={SIZES.sky} onLoad={() => loaded("sky")} className="living-cloud living-cloud-lead" />
            <Image src="/hero/sky.webp" alt="" fill loading="eager" fetchPriority="low" sizes={SIZES.sky} onLoad={() => loaded("sky-2")} className="living-cloud" />
          </div>
          {/* Two turns of different lengths around the same point, so the lean never repeats exactly. */}
          <div className="living-sway absolute" style={{ ...BALLOON, transformOrigin: MOUTH }}>
            <div className="living-lean absolute inset-0" style={{ transformOrigin: MOUTH }}>
              <Image src="/hero/balloon.webp" alt="" fill loading="eager" fetchPriority="low" sizes={SIZES.balloon} onLoad={() => loaded("balloon")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
