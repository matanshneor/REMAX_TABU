"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useRef } from "react";

/**
 * The home opening's photo, alive: the balloon leans slowly from side to side, as in a wind, and
 * the clouds drift (the owner's choice, 12.11.2026). It is the photo itself with three layers cut
 * from it laid exactly over it (public/hero): what is behind the balloon, the sky, and the balloon
 * down to its mouth. The basket, the people and the land stay the photo underneath.
 *
 * The photo and its layers are shown together: the scene stays out of sight until every part has
 * loaded and then fades in already moving, so a visitor never sees a still photo that starts to
 * move (the owner asked for this). The script at the top of the layout decides when, before React
 * starts; a part that has not arrived after three seconds, and the photo is shown still for this
 * visit. Visitors who asked their device for less motion get the still photo at once.
 * The movement stops while the opening is off screen. Styles: globals.css (.living-scene).
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
  photo: "(min-width: 768px) 100vw, 110svh",
  behind: "(min-width: 768px) max(42vw, 63svh), max(42vw, 46svh)",
  sky: "(min-width: 768px) max(100vw, 150svh), max(100vw, 108svh)",
  balloon: "(min-width: 768px) max(40vw, 60svh), max(40vw, 43svh)",
};

/** The photo and the four layer images: the layout's script waits for this many (data-parts). */
const PARTS = 5;

export function LivingPhoto() {
  const scene = useRef<HTMLDivElement>(null);

  // Nothing moves while the opening is off screen.
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // suppressHydrationWarning: the layout's script sets data-live on this element before React starts.
    <div ref={scene} data-parts={PARTS} suppressHydrationWarning className="living-scene absolute inset-0 overflow-hidden">
      {/* A wide screen shows the whole photo. A phone shows its left part (14%), which is where the
          whole balloon fits; .living-stage lays the layers out the same way. */}
      <Image src="/home-hero.jpg" alt="" fill preload sizes={SIZES.photo} className="object-cover object-[14%_center] md:object-center" />
      <div className="living absolute inset-0">
        <div className="living-stage">
          <div className="absolute" style={BEHIND}>
            <Image src="/hero/behind.webp" alt="" fill loading="eager" fetchPriority="high" sizes={SIZES.behind} />
          </div>
          {/* The sky twice: each copy slides a little and fades, half a turn apart (see globals.css). */}
          <div className="absolute" style={SKY}>
            <Image src="/hero/sky.webp" alt="" fill loading="eager" fetchPriority="high" sizes={SIZES.sky} className="living-cloud living-cloud-lead" />
            <Image src="/hero/sky.webp" alt="" fill loading="eager" fetchPriority="high" sizes={SIZES.sky} className="living-cloud" />
          </div>
          {/* Two turns of different lengths around the same point, so the lean never repeats exactly. */}
          <div className="living-sway absolute" style={{ ...BALLOON, transformOrigin: MOUTH }}>
            <div className="living-lean absolute inset-0" style={{ transformOrigin: MOUTH }}>
              <Image src="/hero/balloon.webp" alt="" fill loading="eager" fetchPriority="high" sizes={SIZES.balloon} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
