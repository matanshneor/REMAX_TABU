"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Put at the top of a full-screen opening: while this strip is on screen the site header is clear
 * (the opening shows through it); once the page has scrolled past it, the header turns solid.
 * It sets data-header on <html> (styles in globals.css); the layout sets the same value on the
 * home page before the first paint, so the header doesn't flash solid first.
 */
export function HeaderMode() {
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = strip.current;
    if (!el) return;
    root.dataset.header = "overlay";
    const io = new IntersectionObserver(([e]) => {
      root.dataset.header = e.isIntersecting ? "overlay" : "solid";
    });
    io.observe(el);
    return () => {
      io.disconnect();
      delete root.dataset.header;
    };
  }, []);
  return <div ref={strip} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24" />;
}
