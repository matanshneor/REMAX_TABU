"use client";

import { type CSSProperties, type ElementType, type ReactNode, useEffect, useRef } from "react";

let observer: IntersectionObserver | undefined;

/** One observer for the whole site: an element is shown once, when its top tenth is on screen. */
function shared(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.reveal = "in";
        observer!.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  return observer;
}

/**
 * Content that rises into place the first time it scrolls into view. `index` staggers neighbours
 * (60ms apart). Only elements that start below the screen are hidden, and only once JavaScript is
 * running, so the content is there without JavaScript, before hydration, and for visitors who asked
 * for less motion. The styles are in globals.css ([data-reveal]).
 */
export function Reveal({
  as: Tag = "div",
  index = 0,
  className,
  children,
}: {
  as?: ElementType;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.reveal === "in") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen when the page appears: leave it alone (no flash, no late entrance).
    if (!el.dataset.reveal && el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "armed";
    const io = shared();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return (
    <Tag ref={ref} className={className} style={{ "--i": index } as CSSProperties}>
      {children}
    </Tag>
  );
}
