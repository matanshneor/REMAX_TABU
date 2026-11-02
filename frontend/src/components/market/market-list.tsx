"use client";

import { Building2Icon, ExternalLinkIcon, PlusIcon, ThumbsDownIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import { formatILS, formatRelative } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import type { MarketListing } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "דירה 4 חד׳" from the ad's title, or from its type and rooms. */
export function listingTitle(l: MarketListing): string {
  return l.title || [l.property_type ?? "נכס", l.rooms && `${l.rooms} חד׳`].filter(Boolean).join(" ");
}

/**
 * The pool as a work list anyone can work: what the ad is, how old it is, and the two outcomes
 * of a call — the owner wants the service (add to my sellers) or doesn't (not interested).
 */
export function MarketList({
  rows,
  onOpen,
  onAddToSellers,
  onNotInterested,
  canOpenSeller,
}: {
  rows: MarketListing[];
  /** Sellers are private to their agent: the link shows for whoever added it (and the admin). */
  canOpenSeller: (l: MarketListing) => boolean;
  onOpen: (id: string) => void;
  onAddToSellers: (l: MarketListing) => void;
  onNotInterested: (l: MarketListing) => void;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)]">
      {rows.map((l) => {
        const place = [l.street, l.neighborhood, l.city].filter(Boolean).join(", ");
        // Rooms are already in the title.
        const specs = [l.size_sqm && `${l.size_sqm} מ״ר`, l.floor != null && `קומה ${l.floor}`].filter(Boolean);
        const open = l.status === "new" || l.status === "contacted";
        return (
          <li
            key={l.id}
            onClick={() => onOpen(l.id)}
            className={cn("flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-muted/50", !open && "opacity-70")}
          >
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex items-center gap-2">
                <StatusBadge map={LISTING_STATUS} value={l.status} />
                <p className="truncate font-medium">{listingTitle(l)}</p>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {[place, ...specs].filter(Boolean).join(" · ") || "אין עדיין פרטים — פתחו את המודעה"}
              </p>
            </div>

            <div className="w-28 shrink-0 text-sm font-semibold tabular-nums text-primary">{l.price ? formatILS(l.price) : "—"}</div>
            <div className="w-24 shrink-0 text-xs text-muted-foreground">{formatRelative(l.listed_at)}</div>

            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center justify-end gap-1.5 sm:w-96">
              {l.url && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  render={<a href={l.url} target="_blank" rel="noopener" />}
                  nativeButton={false}
                  aria-label="פתח את המודעה ביד2"
                  title="פתח את המודעה ביד2"
                >
                  <ExternalLinkIcon />
                </Button>
              )}
              {open ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => onNotInterested(l)}>
                    <ThumbsDownIcon />
                    דיברתי – לא מעוניין
                  </Button>
                  <Button size="sm" onClick={() => onAddToSellers(l)}>
                    <PlusIcon />
                    הוסף למוכרים שלי
                  </Button>
                </>
              ) : (
                l.status === "added" &&
                l.property_id &&
                canOpenSeller(l) && (
                  <Button variant="outline" size="sm" render={<Link href={`/properties?open=${l.property_id}`} />} nativeButton={false}>
                    <Building2Icon />
                    לכרטיס המוכר
                  </Button>
                )
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
