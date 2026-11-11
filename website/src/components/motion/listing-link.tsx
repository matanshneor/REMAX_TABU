"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { stashPhoto } from "@/lib/handoff";

/**
 * A link to a listing's page that hands the pressed photo over to it (see lib/handoff.ts).
 * The photo is the one inside the link, or, with photoScope, inside the closest such ancestor.
 */
export function ListingLink({ id, className, photoScope, children }: { id: string; className?: string; photoScope?: string; children: ReactNode }) {
  return (
    <Link
      href={`/properties/${id}`}
      className={className}
      onClick={(e) => {
        const box = photoScope ? e.currentTarget.closest(photoScope) : e.currentTarget;
        stashPhoto(id, box?.querySelector("img")?.currentSrc);
      }}
    >
      {children}
    </Link>
  );
}
