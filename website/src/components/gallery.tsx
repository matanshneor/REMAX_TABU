"use client";

import { ChevronLeftIcon, ChevronRightIcon, ImagesIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, type TouchEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore, ViewTransition } from "react";
import { photoName, pressedPhoto } from "@/lib/handoff";
import { PhotoPlaceholder } from "./listing-photo";
import { FadeImage } from "./motion/fade-image";
import { LEAD_FRAME } from "./motion/photo-handoff";
import { cn, PRESS } from "./ui";

/** Desktop grid (4 columns × 2 rows) without holes, whatever the number of photos. */
function tileSpan(i: number, count: number): string {
  if (count === 1) return "col-span-4 row-span-2";
  if (i === 0 || count === 2) return "col-span-2 row-span-2";
  if (count === 3 || (count === 4 && i === 1)) return "col-span-2";
  return "";
}

const DESKTOP = "(min-width: 1024px)";
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

/**
 * Listing photos. Desktop: one large photo and four small ones beside it. Phone: one tall photo
 * with arrows. Either way, "כל התמונות" opens every photo full screen (Esc / arrows / swipe), and
 * the viewer opens out of the photo that was pressed.
 *
 * The main photo carries the listing's photo name, so a photo pressed on a card travels into it
 * (lib/handoff.ts). Only the layout that is on screen carries the name: a name may exist once.
 */
export function Gallery({ id, photos, title }: { id: string; photos: string[]; title: string }) {
  // The photo on show, and the one it replaced (kept for a moment so the two cross-fade in the viewer).
  const [{ index, leaving }, setView] = useState<{ index: number; leaving: number | null }>({ index: 0, leaving: null });
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isDesktop = useIsDesktop();
  // The pressed photo (small, already loaded) stays under the full-size one until that has loaded.
  const [poster] = useState(() => pressedPhoto(id)?.src);
  const posterStyle: CSSProperties | undefined = poster ? { backgroundImage: `url("${poster}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  const count = photos.length;
  const alt = (i: number) => `${title}, תמונה ${i + 1} מתוך ${count}`;

  const go = useCallback((step: number) => setView((v) => ({ index: (v.index + step + count) % count, leaving: v.index })), [count]);

  const show = (i: number, from: HTMLElement) => {
    opener.current = from;
    // The viewer grows out of the pressed photo.
    const r = from.getBoundingClientRect();
    dialog.current?.style.setProperty("--ox", `${((r.left + r.width / 2) / window.innerWidth) * 100}%`);
    dialog.current?.style.setProperty("--oy", `${((r.top + r.height / 2) / window.innerHeight) * 100}%`);
    setView({ index: i, leaving: null });
    setEverOpened(true);
    setOpen(true);
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // The page may be put aside while the viewer is open (back / forward): close it then.
  useEffect(() => {
    const d = dialog.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    // RTL: the right arrow goes back, the left arrow goes forward.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go]);

  const touchX = useRef<number | null>(null);
  const swipe = {
    onTouchStart: (e: TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: TouchEvent) => {
      if (touchX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1); // RTL: swiping right shows the next photo
    },
  };

  if (count === 0) {
    return (
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/7]">
        <PhotoPlaceholder />
      </div>
    );
  }

  const control = cn("inline-flex items-center justify-center bg-night/80 text-ink backdrop-blur hover:bg-night", PRESS);
  const arrow = cn(control, "size-11");
  const allButton = (className?: string) => (
    <button type="button" onClick={(e) => show(index, e.currentTarget)} className={cn(control, "min-h-11 gap-2 px-4 text-sm font-medium", className)}>
      <ImagesIcon className="size-4" aria-hidden="true" />
      כל התמונות ({count})
    </button>
  );

  return (
    <div>
      {/* Phone: one tall photo with arrows */}
      <ViewTransition name={isDesktop ? undefined : photoName(id)} share="morph" default="none">
        <div className={cn(LEAD_FRAME, "lg:hidden")} style={posterStyle} {...swipe}>
          <button type="button" onClick={(e) => show(index, e.currentTarget)} className="absolute inset-0" aria-label={`הגדלת ${alt(index)}`}>
            <Image src={photos[index]} alt={alt(index)} fill fetchPriority="high" sizes="100vw" className="object-cover" />
          </button>
          {count > 1 && (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
              <button type="button" onClick={() => go(-1)} className={arrow} aria-label="התמונה הקודמת">
                <ChevronRightIcon className="size-5" aria-hidden="true" />
              </button>
              <span className="bg-night/80 px-3 py-1.5 text-sm tabular-nums" aria-live="polite">
                {index + 1} / {count}
              </span>
              <button type="button" onClick={() => go(1)} className={arrow} aria-label="התמונה הבאה">
                <ChevronLeftIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
          {allButton("absolute end-4 top-4")}
        </div>
      </ViewTransition>

      {/* Desktop: a large photo and four small ones */}
      <div className="relative hidden h-[min(72vh,640px)] grid-cols-4 grid-rows-2 gap-2 lg:grid">
        {photos.slice(0, 5).map((src, i) => {
          const tile = (
            <button
              key={src}
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className={cn("group/tile relative overflow-hidden bg-panel", tileSpan(i, count))}
              style={i === 0 ? posterStyle : undefined}
              aria-label={`הגדלת ${alt(i)}`}
            >
              {/* The zoom is on a wrapper, so the photo itself is free to fade in when it loads. */}
              <span className="absolute inset-0 block transition-transform duration-(--dur-open) ease-out group-hover/tile:scale-[1.04]">
                {i === 0 ? (
                  <Image src={src} alt={alt(i)} fill fetchPriority="high" sizes="(min-width: 1280px) 640px, 50vw" className="object-cover" />
                ) : (
                  <FadeImage src={src} alt={alt(i)} fill sizes="(min-width: 1280px) 320px, 25vw" className="object-cover" />
                )}
              </span>
            </button>
          );
          return i === 0 ? (
            <ViewTransition key={src} name={isDesktop ? photoName(id) : undefined} share="morph" default="none">
              {tile}
            </ViewTransition>
          ) : (
            tile
          );
        })}
        {allButton("absolute bottom-4 end-4")}
      </div>

      <dialog
        ref={dialog}
        aria-label={`תמונות: ${title}`}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
        className="lightbox m-0 h-dvh max-h-none w-screen max-w-none bg-night p-0 text-ink"
      >
        {/* Stays in place after the first opening, so the closing fade has something to fade. */}
        {everOpened && (
          <div className="flex h-full flex-col" {...swipe}>
            <div className="flex items-center justify-between px-4 py-3 sm:px-8">
              <span className="tabular-nums text-ink-2" aria-live="polite">
                {index + 1} / {count}
              </span>
              <button type="button" onClick={() => setOpen(false)} className={arrow} aria-label="סגירה" autoFocus>
                <XIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="lightbox-stage relative min-h-0 flex-1">
              {leaving != null && leaving !== index && (
                <Image key={`out-${leaving}`} src={photos[leaving]} alt="" fill sizes="100vw" className="photo-out object-contain" />
              )}
              <Image key={index} src={photos[index]} alt={alt(index)} fill loading="eager" sizes="100vw" className="photo-in object-contain" />
            </div>
            {count > 1 && (
              <div className="flex items-center justify-center gap-4 py-4">
                <button type="button" onClick={() => go(-1)} className={arrow} aria-label="התמונה הקודמת">
                  <ChevronRightIcon className="size-5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => go(1)} className={arrow} aria-label="התמונה הבאה">
                  <ChevronLeftIcon className="size-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
