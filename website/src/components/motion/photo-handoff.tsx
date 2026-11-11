"use client";

import { useState, ViewTransition } from "react";
import { photoName, pressedPhoto } from "@/lib/handoff";

/** The slot of a listing page's main photo: the whole width on phones, the leading half on desktop. */
export const LEAD_FRAME =
  "relative -mx-4 aspect-[4/3] overflow-hidden bg-panel sm:mx-0 sm:aspect-[16/9] lg:aspect-auto lg:h-[min(48vh,460px)] lg:w-[calc(50%-0.25rem)]";

/**
 * Shown while a listing's details are on their way. If the visitor came by pressing a listing, the
 * pressed photo is already here, under the same name as on the card, so the browser carries it from
 * the card into this slot. On a direct visit there is no pressed photo: a quiet placeholder.
 */
export function PhotoHandoff() {
  // Read once, when the page shell appears. Null on the server and on direct visits.
  const [hit] = useState(() => pressedPhoto());
  if (!hit) return <div className={`${LEAD_FRAME} animate-pulse`} />;
  return (
    <ViewTransition name={photoName(hit.id)} share="morph" default="none">
      <div className={LEAD_FRAME}>
        {/* The exact file the card already loaded; next/image would request a different size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hit.src} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
    </ViewTransition>
  );
}
