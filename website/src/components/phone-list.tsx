"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { buttonClass, cn } from "./ui";

/** How many listings a phone shows before the "more" button. */
export const PHONE_FIRST = 3;

/**
 * The list of listings. On a phone it starts with the first three and a button that shows the
 * rest, so the page isn't one long scroll (the owner's choice); wider screens show them all.
 * The hiding is CSS (globals.css, .phone-three) and only applies once JavaScript is running, so
 * without it every listing is simply there.
 */
export function PhoneList({ count, className, children }: { count: number; className?: string; children: ReactNode }) {
  const [all, setAll] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const rest = count - PHONE_FIRST;

  // Keyboard and screen-reader users continue from the first listing that just appeared.
  useEffect(() => {
    if (all) list.current?.querySelector<HTMLElement>(`li:nth-child(${PHONE_FIRST + 1}) a`)?.focus({ preventScroll: true });
  }, [all]);

  return (
    <>
      <ul ref={list} data-all={all ? "" : undefined} className={cn("phone-three", className)}>
        {children}
      </ul>
      {rest > 0 && !all && (
        <div className="phone-more mt-12 sm:hidden">
          <button type="button" onClick={() => setAll(true)} className={buttonClass("outline", "w-full")}>
            הצגת עוד נכסים ({rest})
          </button>
        </div>
      )}
    </>
  );
}
