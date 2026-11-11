"use client";

import { ChevronLeftIcon, ChevronRightIcon, ImagesIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, type ReactNode, type TouchEvent, useCallback, useEffect, useRef, useState, ViewTransition } from "react";
import { photoName, pressedPhoto } from "@/lib/handoff";
import { PhotoPlaceholder } from "./listing-photo";
import { HeaderMode } from "./motion/header-mode";
import { LEAD_FRAME } from "./motion/photo-handoff";
import { cn, PRESS } from "./ui";

/**
 * The opening of a listing's page: its first photo on the whole screen, under the header (clear
 * until the page scrolls), like the home page's. `children` is what is written over the photo
 * (name, price, main facts); `top` sits under the header (the way back). "כל התמונות" opens every
 * photo full screen (Esc / arrows / swipe), growing out of the photo.
 *
 * The photo carries the listing's photo name, so a photo pressed on a card travels into it
 * (lib/handoff.ts).
 */
export function Gallery({ id, photos, title, top, children }: { id: string; photos: string[]; title: string; top?: ReactNode; children?: ReactNode }) {
  // The photo on show, and the one it replaced (kept for a moment so the two cross-fade in the viewer).
  const [{ index, leaving }, setView] = useState<{ index: number; leaving: number | null }>({ index: 0, leaving: null });
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  // The small copy of the photo that was pressed: shown in the viewer until the full-size one loads.
  const [opened, setOpened] = useState<{ index: number; src: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
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
    const small = from.querySelector("img")?.currentSrc;
    setOpened(small ? { index: i, src: small } : null);
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

  const control = cn("inline-flex items-center justify-center bg-night/80 text-ink backdrop-blur hover:bg-night", PRESS);
  const arrow = cn(control, "size-11");
  const shade =
    "pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_26%),linear-gradient(to_left,rgba(10,26,58,0.92)_0%,rgba(10,26,58,0.6)_38%,rgba(10,26,58,0.1)_70%),linear-gradient(to_top,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_45%)] max-md:bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_22%),linear-gradient(to_top,rgba(10,26,58,0.95)_0%,rgba(10,26,58,0.7)_50%,rgba(10,26,58,0.25)_100%)]";

  return (
    <div>
      <ViewTransition name={photoName(id)} share="morph" default="none">
        <div className={LEAD_FRAME} style={posterStyle}>
          <HeaderMode />
          {count === 0 ? (
            <PhotoPlaceholder />
          ) : (
            <button type="button" onClick={(e) => show(0, e.currentTarget)} className="absolute inset-0 z-[1]" aria-label={`הגדלת ${alt(0)}`}>
              <Image src={photos[0]} alt={alt(0)} fill fetchPriority="high" sizes="100vw" className="object-cover" />
            </button>
          )}
          <div aria-hidden="true" className={shade} />
          <div className="pointer-events-none relative z-[4] mx-auto flex w-full max-w-7xl flex-col justify-between gap-10 px-4 pb-24 pt-18 sm:px-8 sm:pt-24 lg:pb-14">
            <div className="pointer-events-auto self-start">{top}</div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="pointer-events-auto max-w-2xl">{children}</div>
              {count > 0 && (
                <button
                  type="button"
                  onClick={(e) => show(0, e.currentTarget)}
                  className={cn(control, "pointer-events-auto min-h-11 gap-2 px-4 text-sm font-medium")}
                >
                  <ImagesIcon className="size-4" aria-hidden="true" />
                  כל התמונות ({count})
                </button>
              )}
            </div>
          </div>
        </div>
      </ViewTransition>

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
            <div
              className="lightbox-stage relative min-h-0 flex-1 bg-contain bg-center bg-no-repeat"
              style={opened?.index === index ? { backgroundImage: `url("${opened.src}")` } : undefined}
            >
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
