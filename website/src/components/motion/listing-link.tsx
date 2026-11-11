"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { stashPhoto } from "@/lib/handoff";

/** A link to a listing's page that hands the pressed photo over to it (see lib/handoff.ts). */
export function ListingLink({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={`/properties/${id}`}
      className={className}
      onClick={(e) => stashPhoto(id, e.currentTarget.querySelector("img")?.currentSrc)}
    >
      {children}
    </Link>
  );
}
