"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn, PRESS } from "./ui";

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
        className={cn("inline-flex size-11 items-center justify-center border border-line-strong text-ink", PRESS)}
      >
        {open ? <XIcon className="size-5" aria-hidden="true" /> : <MenuIcon className="size-5" aria-hidden="true" />}
      </button>
      {/* Always in the page so it can fade and settle in; out of reach (and of screen readers) while closed. */}
      <nav
        id={id}
        aria-label="ראשי"
        className={cn(
          "absolute inset-x-0 top-full border-b border-line bg-night transition-[opacity,translate,visibility] duration-(--dur-ui) ease-out",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
        )}
      >
        <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-8">
          {items.map((n) => (
            <li key={n.href} className="border-b border-line last:border-0">
              <Link href={n.href} onClick={() => setOpen(false)} className="type-subtitle flex min-h-14 items-center">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
