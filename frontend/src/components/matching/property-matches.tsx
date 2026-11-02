"use client";

import { useQuery } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PanelSection } from "@/components/crm/panel";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Money } from "@/components/crm/money";
import { formatAddress } from "@/lib/format";
import { matchBuyerToProperty } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";
import type { Buyer, Property } from "@/lib/types";
import { propertyMessage } from "@/lib/whatsapp";
import { MatchReasons } from "./match-reasons";
import { useOfficeListings } from "./office-listings";

const MAX_MATCHES = 10;

/**
 * In a buyer's card: offered sellers across the office that fit what the buyer is looking for.
 * Sellers are private to their agent: one's own (or, for the admin, any) shows its address and a
 * WhatsApp send; a colleague's shows its facts and whose listing it is, to coordinate with them.
 */
export function PropertyMatches({ buyer }: { buyer: Buyer }) {
  const { data: listings = [], isLoading } = useOfficeListings();
  // The properties this user may open (RLS: their own, or all for the admin).
  const { data: visible = [] } = useQuery({
    queryKey: ["properties", "visible-for-matching"],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await createClient().from("properties").select("*").eq("status", "active").neq("engagement", "recruiting");
      if (error) throw error;
      return data;
    },
  });

  const matches = useMemo(() => {
    const full = new Map(visible.map((p) => [p.id, p]));
    return listings
      .map((l) => ({ listing: l, property: full.get(l.id), match: matchBuyerToProperty(buyer, l) }))
      .filter((m) => m.match.ok)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, MAX_MATCHES);
  }, [listings, visible, buyer]);

  return (
    <PanelSection title={`מוכרים שמתאימים${matches.length ? ` (${matches.length})` : ""}`}>
      {isLoading ? null : matches.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4" />
          אין כרגע מוכרים שעומדים בכל הדרישות של הקונה
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.map(({ listing: l, property: p, match }) => (
            <li key={l.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                {p ? (
                  <Link href={`/properties?open=${p.id}`} className="font-medium hover:underline">
                    {formatAddress(p)}
                  </Link>
                ) : (
                  <p className="font-medium">
                    {[l.property_type ?? "נכס", l.rooms && `${l.rooms} חד׳`].filter(Boolean).join(" ")}
                    <span className="ms-1.5 font-normal text-muted-foreground">· אצל {l.agent_name ?? "סוכן במשרד"}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {[l.neighborhood, p && l.rooms && `${l.rooms} חד׳`, l.size_sqm && `${l.size_sqm} מ״ר`, l.floor != null && `קומה ${l.floor}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <MatchReasons reasons={match.reasons} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money value={l.current_price} className="font-display text-base text-primary" />
                {p && (
                  <WhatsAppButton
                    phone={buyer.phone}
                    text={propertyMessage(p, buyer.full_name)}
                    size="icon-sm"
                    label={`שלח ל${buyer.full_name} בוואטסאפ`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
