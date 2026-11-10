"use client";

import { ChevronLeftIcon, ChevronRightIcon, ImagesIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoPlaceholder } from "./listing-photo";
import { cn } from "./ui";

/** Desktop grid (4 columns × 2 rows) without holes, whatever the number of photos. */
function tileSpan(i: number, count: number): string {
  if (count === 1) return "col-span-4 row-span-2";
  if (i === 0 || count === 2) return "col-span-2 row-span-2";
  if (count === 3 || (count === 4 && i === 1)) return "col-span-2";
  return "";
}

/**
 * Listing photos. Desktop: one large photo and four small ones beside it. Phone: one tall photo
 * with arrows. Either way, "כל התמונות" opens every photo full screen (Esc / arrows / swipe).
 */
export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const count = photos.length;
  const alt = (i: number) => `${title}, תמונה ${i + 1} מתוך ${count}`;

  const go = useCallback((step: number) => setIndex((i) => (i + step + count) % count), [count]);

  const show = (i: number, from: HTMLElement) => {
    opener.current = from;
    setIndex(i);
    setOpen(true);
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

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
    onTouchStart: (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
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

  const allButton = (className?: string) => (
    <button
      type="button"
      onClick={(e) => show(index, e.currentTarget)}
      className={cn("inline-flex min-h-11 items-center gap-2 bg-night/85 px-4 text-sm font-medium backdrop-blur hover:bg-night", className)}
    >
      <ImagesIcon className="size-4" aria-hidden="true" />
      כל התמונות ({count})
    </button>
  );

  const arrow = "inline-flex size-11 items-center justify-center bg-night/80 text-ink backdrop-blur hover:bg-night";

  return (
    <div>
      {/* Phone: one tall photo with arrows */}
      <div className="relative -mx-4 aspect-[4/5] overflow-hidden bg-panel sm:mx-0 lg:hidden" {...swipe}>
        <button type="button" onClick={(e) => show(index, e.currentTarget)} className="absolute inset-0" aria-label={`הגדלת ${alt(index)}`}>
          <Image src={photos[index]} alt={alt(index)} fill priority sizes="100vw" className="object-cover" />
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

      {/* Desktop: a large photo and four small ones */}
      <div className="relative hidden h-[min(72vh,640px)] grid-cols-4 grid-rows-2 gap-2 lg:grid">
        {photos.slice(0, 5).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={(e) => show(i, e.currentTarget)}
            className={cn("relative overflow-hidden bg-panel", tileSpan(i, count))}
            aria-label={`הגדלת ${alt(i)}`}
          >
            <Image
              src={src}
              alt={alt(i)}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 1280px) 640px, 50vw" : "(min-width: 1280px) 320px, 25vw"}
              className="object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </button>
        ))}
        {allButton("absolute bottom-4 end-4")}
      </div>

      <dialog
        ref={dialog}
        aria-label={`תמונות: ${title}`}
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-night/97 p-0 text-ink backdrop:bg-night/90"
      >
        {open && (
          <div className="flex h-full flex-col" {...swipe}>
            <div className="flex items-center justify-between px-4 py-3 sm:px-8">
              <span className="tabular-nums text-ink-2" aria-live="polite">
                {index + 1} / {count}
              </span>
              <button type="button" onClick={() => setOpen(false)} className={arrow} aria-label="סגירה" autoFocus>
                <XIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image src={photos[index]} alt={alt(index)} fill sizes="100vw" className="object-contain" />
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
