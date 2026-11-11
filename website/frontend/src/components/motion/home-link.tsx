"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The logo's link to the home page. From any other page it goes there as usual (and lands at the
 * top). On the home page itself it would do nothing, because the address doesn't change, so it
 * takes the visitor back to the top instead.
 */
export function HomeLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link
      href="/"
      className={className}
      onClick={(e) => {
        if (location.pathname !== "/" || location.search || location.hash) return; // a real navigation: the router handles it
        e.preventDefault();
        scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
    >
      {children}
    </Link>
  );
}
