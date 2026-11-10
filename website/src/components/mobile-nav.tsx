"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/** The menu on phones: a button that opens the links under the header. A link or Esc closes it. */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "סגירת התפריט" : "פתיחת התפריט"}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center border border-line-strong text-ink"
      >
        {open ? <XIcon className="size-5" aria-hidden="true" /> : <MenuIcon className="size-5" aria-hidden="true" />}
      </button>
      <nav id={id} aria-label="ראשי" hidden={!open} className="absolute inset-x-0 top-full border-b border-line bg-night">
        <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
          {items.map((n) => (
            <li key={n.href} className="border-b border-line last:border-0">
              <Link href={n.href} onClick={() => setOpen(false)} className="flex min-h-14 items-center font-serif text-xl font-light">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
