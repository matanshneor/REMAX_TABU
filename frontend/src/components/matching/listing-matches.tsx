"use client";

import { InboxIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PanelSection } from "@/components/crm/panel";
import { Money } from "@/components/crm/money";
import { StatusBadge } from "@/components/crm/status-badge";
import { useMarketListings } from "@/components/market/use-market";
import { LISTING_STATUS } from "@/lib/labels";
import { matchBuyerToListing } from "@/lib/matching";
import type { Buyer } from "@/lib/types";
import { MatchReasons } from "./match-reasons";

const MAX_MATCHES = 10;

/**
 * In a buyer's card: listings from the Yad2 pool that fit what the buyer is looking for.
 * Shows the whole pool, including listings marked "not relevant" or already added to sellers
 * (marked as such), newest first among equal fits.
 */
export function ListingMatches({ buyer }: { buyer: Buyer }) {
  const { data: listings = [], isLoading } = useMarketListings();

  const matches = useMemo(
    () =>
      listings
        .map((l) => ({ listing: l, match: matchBuyerToListing(buyer, l) }))
        .filter((m) => m.match.ok)
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, MAX_MATCHES),
    [listings, buyer],
  );

  return (
    <PanelSection title={`מודעות יד 2 שמתאימות${matches.length ? ` (${matches.length})` : ""}`}>
      {isLoading ? null : matches.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <InboxIcon className="size-4" />
          אין כרגע מודעות במאגר יד 2 שמתאימות לדרישות הקונה
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.map(({ listing: l, match }) => (
            <li key={l.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/market?open=${l.id}`} className="font-medium hover:underline">
                  {[l.street ?? l.title ?? l.property_type ?? "מודעה", l.rooms && `${l.rooms} חד׳`].filter(Boolean).join(" · ")}
                </Link>
                {(l.status === "not_interested" || l.status === "added") && (
                  <span className="ms-1.5 align-middle">
                    <StatusBadge map={LISTING_STATUS} value={l.status} />
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {[l.neighborhood, l.size_sqm && `${l.size_sqm} מ״ר`, l.floor != null && `קומה ${l.floor}`].filter(Boolean).join(" · ")}
                </p>
                <MatchReasons reasons={match.reasons} />
              </div>
              <Money value={l.price} className="shrink-0 font-display text-base text-primary" />
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
