"use client";

import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { stashPhoto } from "@/lib/handoff";
import { PhotoPlaceholder } from "./listing-photo";
import { HeaderMode } from "./motion/header-mode";
import { cn, NewTag, PRESS } from "./ui";

/** One listing as the opening slider shows it (prepared on the server). */
export type NovaSlide = {
  id: string;
  image: string | null; // /media/... or null for the branded stand-in
  name: string; // "בית פרטי ברחוב תגר 15"
  place: string; // "פסגת זאב מזרח, ירושלים"
  price: string; // "6,490,000 ₪"
  facts: string[]; // ["7 חדרים", "250 מ״ר", "ממ״ד"]
  blurb: string; // the start of the description
  isNew: boolean;
};

const OPEN_MS = 900; // --dur-open
const CARDS = 3;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The opening of the home page: the current listing's photo fills the screen (under the header,
 * which stays clear until the page scrolls) with its details on the start side, and the next
 * listings wait as cards on the end side. Choosing a card opens its photo from the card into the
 * full screen, then the details rise in.
 *
 * Listings change only when the visitor asks: an arrow, a card, a swipe, or the arrow keys.
 */
export function NovaHero({ slides }: { slides: NovaSlide[] }) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const section = useRef<HTMLElement>(null);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const show = useCallback(
    (target: number) => {
      setPrevious(active);
      setActive(target);
    },
    [active],
  );

  const go = useCallback(
    (next: number, from?: DOMRect) => {
      if (busy || count < 2) return;
      const target = ((next % count) + count) % count;
      if (target === active) return;
      const layer = layers.current[target];
      const box = section.current?.getBoundingClientRect();

      // Nothing to open from (the previous listing, phones, less motion): a soft cross-fade.
      if (!layer || !box || !from || reducedMotion()) {
        show(target);
        return;
      }

      // Open the target photo from the card's rectangle to the whole section.
      const inset = `inset(${from.top - box.top}px ${box.right - from.right}px ${box.bottom - from.bottom}px ${from.left - box.left}px)`;
      setBusy(true);
      layer.style.transition = "none";
      layer.style.zIndex = "2";
      layer.style.opacity = "1";
      layer.style.clipPath = inset;
      void layer.offsetWidth; // apply the start state before animating
      layer.style.transition = `clip-path ${OPEN_MS}ms var(--ease-in-out)`;
      layer.style.clipPath = "inset(0px 0px 0px 0px)";
      window.setTimeout(() => {
        show(target);
        layer.style.transition = "";
        layer.style.zIndex = "";
        layer.style.opacity = "";
        layer.style.clipPath = "";
        setBusy(false);
      }, OPEN_MS);
    },
    [active, busy, count, show],
  );

  // "Next" opens the photo out of the first waiting card (when the cards are on screen);
  // "previous" has no card to open from, so it cross-fades.
  const step = (dir: 1 | -1) => {
    const card = dir === 1 ? section.current?.querySelector<HTMLElement>('[data-card="first"]') : null;
    const rect = card && card.offsetParent ? card.getBoundingClientRect() : undefined;
    go(active + dir, rect);
  };
  // Keyboard, while focus is inside the slider. RTL: ← is the next listing.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? 1 : -1);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  const swipe = {
    onTouchStart: (e: TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: TouchEvent) => {
      if (touchX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) > 50) step(dx > 0 ? 1 : -1); // RTL: a swipe to the right brings the next one
    },
  };

  if (!count) return null;
  const s = slides[active];
  const waiting = Array.from({ length: Math.min(CARDS, count - 1) }, (_, k) => (active + 1 + k) % count);
  const control = cn("inline-flex size-12 shrink-0 items-center justify-center border border-line-strong text-ink hover:border-ink-2 hover:bg-night/60", PRESS);

  return (
    <section
      ref={section}
      aria-roledescription="קרוסלה"
      aria-labelledby="hero-title"
      className="relative isolate -mt-16 flex min-h-svh overflow-hidden sm:-mt-20"
      {...swipe}
    >
      <HeaderMode />

      {/* Photo layers: all listings stacked, the active one shown. Every layer loads up front so
          a card can open into its photo without a blank frame. The photo on show drifts slowly. */}
      {slides.map((sl, i) => (
        <div
          key={sl.id}
          ref={(el) => {
            layers.current[i] = el;
          }}
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-(--dur-enter) ease-out"
          style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0 }}
        >
          <div className={cn("absolute inset-0", (i === active || i === previous) && "drift")}>
            {sl.image ? (
              <Image src={sl.image} alt="" fill loading="eager" fetchPriority={i === 0 ? "high" : "auto"} sizes="100vw" className="object-cover" />
            ) : (
              <PhotoPlaceholder label="" />
            )}
          </div>
        </div>
      ))}

      {/* Shade: dark behind the header, on the text side and at the bottom, so everything reads on any photo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_26%),linear-gradient(to_left,rgba(10,26,58,0.92)_0%,rgba(10,26,58,0.6)_38%,rgba(10,26,58,0.1)_70%),linear-gradient(to_top,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_45%)] max-md:bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_22%),linear-gradient(to_top,rgba(10,26,58,0.95)_0%,rgba(10,26,58,0.7)_45%,rgba(10,26,58,0.2)_100%)]"
      />

      <div className="relative z-[4] mx-auto flex w-full max-w-7xl flex-col justify-between gap-10 px-4 pb-8 pt-26 sm:px-8 sm:pb-10 sm:pt-34">
        {/* Top: the site's own line */}
        <h1 id="hero-title" className="label-caps text-ink-2">
          RE/MAX טאבו נכסים · ירושלים
        </h1>

        <div className="flex items-end justify-between gap-10">
          {/* The current listing. Keyed so its lines rise in again on every change. */}
          <div key={s.id} className="max-w-xl" aria-live="polite">
            <p className="rise label-caps flex items-center gap-2 text-ink-2" style={{ animationDelay: "40ms" }}>
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {s.place}
              {s.isNew && <NewTag className="ms-2" />}
            </p>
            <h2 className="rise accent-line type-display mt-5" style={{ animationDelay: "100ms" }}>
              {s.name}
            </h2>
            {s.blurb && (
              <p className="rise mt-5 line-clamp-3 max-w-lg leading-relaxed text-ink-2 max-sm:hidden" style={{ animationDelay: "160ms" }}>
                {s.blurb}
              </p>
            )}
            <div className="rise mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2" style={{ animationDelay: "220ms" }}>
              <span className="type-title">{s.price}</span>
              {s.facts.length > 0 && <span className="text-sm text-ink-2">{s.facts.join(" · ")}</span>}
            </div>
            <div className="rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ animationDelay: "280ms" }}>
              <Link
                href={`/properties/${s.id}`}
                onClick={(e) => {
                  // Not while a photo is opening; and hand the photo on show over to the listing's page.
                  if (busy) e.preventDefault();
                  else stashPhoto(s.id, layers.current[active]?.querySelector("img")?.currentSrc);
                }}
                className="group/cta inline-flex min-h-12 items-center gap-4"
              >
                <span className={cn("inline-flex size-12 items-center justify-center bg-red text-white group-hover/cta:bg-red-dark group-active/cta:scale-[0.97]", PRESS)}>
                  <ArrowLeftIcon className="size-5 transition-transform duration-(--dur-ui) ease-out group-hover/cta:-translate-x-1" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium tracking-[0.2em]">לפרטי הנכס</span>
              </Link>
              <a
                href="#listings"
                className="inline-flex min-h-11 items-center text-sm text-ink-2 underline decoration-line-strong underline-offset-8 transition-colors duration-(--dur-ui) hover:text-ink"
              >
                לכל הנכסים
              </a>
            </div>
          </div>

          {/* The next listings, waiting as cards (desktop). */}
          {waiting.length > 0 && (
            <ul className="hidden shrink-0 items-end gap-4 lg:flex" aria-label="הנכסים הבאים">
              {waiting.map((i, k) => {
                const w = slides[i];
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      data-card={k === 0 ? "first" : undefined}
                      onClick={(e) => {
                        go(i, e.currentTarget.getBoundingClientRect());
                      }}
                      disabled={busy}
                      className={cn("group/card relative block h-64 w-44 overflow-hidden bg-panel text-start xl:h-72 xl:w-48", PRESS)}
                    >
                      {w.image ? (
                        <Image
                          src={w.image}
                          alt=""
                          fill
                          sizes="200px"
                          className="object-cover transition-transform duration-(--dur-open) ease-out group-hover/card:scale-[1.05]"
                        />
                      ) : (
                        <PhotoPlaceholder label="" />
                      )}
                      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent" />
                      <span className="absolute inset-x-4 bottom-4 block">
                        <span className="label-caps block truncate text-ink-2">{w.place.split(",")[0]}</span>
                        <span className="mt-1.5 block font-serif text-lg leading-snug">{w.name}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Controls: arrows and the line that shows where we are. */}
        {count > 1 && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => step(-1)} disabled={busy} aria-label="הנכס הקודם" className={control}>
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => step(1)} disabled={busy} aria-label="הנכס הבא" className={control}>
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <div className="relative ms-1 h-px flex-1 bg-line-strong" aria-hidden="true">
              <div
                className="absolute inset-y-[-1px] start-0 bg-red transition-[width] duration-(--dur-enter) ease-out"
                style={{ width: `${((active + 1) / count) * 100}%` }}
              />
            </div>
            {/* Where we are, in words, for screen readers (the line says it to the eye). */}
            <p className="sr-only" data-position>
              נכס {active + 1} מתוך {count}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
