"use client";

import { Money } from "@/components/crm/money";
import { cn } from "@/lib/utils";
import { PropertyPlaceholder } from "@/components/properties/property-placeholder";
import type { MarketListing } from "@/lib/types";

/** "דירה 4 חד׳" from the ad's title, or from its type and rooms. */
export function listingTitle(l: MarketListing): string {
  return l.title || [l.property_type ?? "נכס", l.rooms && `${l.rooms} חד׳`].filter(Boolean).join(" ");
}

export function listingPlace(l: MarketListing): string {
  return [l.street, l.neighborhood, l.city].filter(Boolean).join(", ");
}

/** The listing's main photo: the first one added (signed URL), else the one from Yad2's e-mail. */
export function listingPhoto(l: MarketListing, signed: Record<string, string>): string | undefined {
  const first = l.image_paths[0];
  return (first && signed[first]) || l.image_url || undefined;
}

/** On a listing this user hasn't opened yet. */
function NewTag() {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11.5px] font-semibold text-primary-foreground shadow-sm">
      <span className="size-1.5 rounded-full bg-sky-300" />
      חדשה
    </span>
  );
}

function Yad2Tag() {
  return <span className="rounded-md bg-[#ff7100] px-1.5 py-0.5 text-[11px] font-bold text-white">יד2</span>;
}

/**
 * Open listings as cards, like the sellers page; a click opens the listing's card.
 * "חדשה" marks the ones this user hasn't opened yet (`seen` holds the ones they have).
 */
export function MarketGrid({
  rows,
  photos,
  seen,
  onOpen,
}: {
  rows: MarketListing[];
  photos: Record<string, string>;
  seen: Set<string> | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {rows.map((l) => {
        const photo = listingPhoto(l, photos);
        // Until the views load, nothing is marked (rather than everything flashing "חדשה").
        const fresh = seen && !seen.has(l.id) && <NewTag />;
        const specs = [l.size_sqm && `${l.size_sqm} מ״ר`, l.floor != null && (l.floor === 0 ? "קומת קרקע" : `קומה ${l.floor}`)].filter(Boolean);
        return (
          <button
            key={l.id}
            onClick={() => onOpen(l.id)}
            className="group flex flex-col overflow-hidden rounded-xl border bg-card text-start shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(15_26_46/0.05),0_18px_36px_-14px_rgb(15_26_46/0.25)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {/* No photo yet: a low strip with the office's soft placeholder (no caption), so the details lead. */}
            <div className={cn("relative bg-muted", photo ? "aspect-[16/9]" : "h-14")}>
              {photo ? (
                // Outside or short-lived signed URLs; next/image optimization isn't useful here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <PropertyPlaceholder label="" className="absolute inset-0 [&_img]:size-6" />
              )}
              <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
                {fresh || <span />}
                <Yad2Tag />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3.5">
              {l.price ? (
                <Money value={l.price} className="font-display text-xl text-primary" />
              ) : (
                <p className="font-display text-xl text-muted-foreground">מחיר לא צוין</p>
              )}
              <p className="truncate font-medium">{listingTitle(l)}</p>
              <p className="truncate text-sm text-muted-foreground">{listingPlace(l) || "אין עדיין כתובת — פתחו את המודעה"}</p>
              {specs.length > 0 && <p className="text-sm tabular-nums">{specs.join(" · ")}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Handled listings, small, under the grid: what it was, and who handled it when
 * (and why, for "לא רלוונטי"). A click opens the listing's card.
 */
export function HandledList({
  rows,
  detail,
  onOpen,
}: {
  rows: MarketListing[];
  detail: (l: MarketListing) => React.ReactNode;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
      {rows.map((l) => (
        <li key={l.id}>
          <button onClick={() => onOpen(l.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-start hover:bg-muted/50">
            <span className="min-w-0 flex-1 truncate">
              {listingTitle(l)}
              {listingPlace(l) && <span className="text-muted-foreground"> · {listingPlace(l)}</span>}
            </span>
            <span className="text-xs text-muted-foreground">{detail(l)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
