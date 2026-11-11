"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef } from "react";

/**
 * A lazy photo that fades in if it was still loading when it reached the screen, instead of
 * popping in. A photo that is already loaded is left alone, and JavaScript is what hides the
 * loading one, so without JavaScript every photo simply shows. (Styles: [data-fade] in globals.css.)
 */
export function FadeImage(props: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (!img || img.complete || img.dataset.fade) return;
    img.dataset.fade = "wait";
    const done = () => {
      img.dataset.fade = "in";
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      // Never leave a photo hidden (the page may be put aside and shown again later).
      if (img.dataset.fade === "wait") img.dataset.fade = "in";
    };
  }, []);
  // eslint-disable-next-line jsx-a11y/alt-text -- alt comes with the props
  return <Image ref={ref} {...props} />;
}
