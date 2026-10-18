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

const MAX_MATCHES = 10;

/** In a buyer's card: active sellers that fit what the buyer is looking for. */
export function PropertyMatches({ buyer }: { buyer: Buyer }) {
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "active-for-matching"],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await createClient().from("properties").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const matches = useMemo(
    () =>
      properties
        .map((p) => ({ property: p, match: matchBuyerToProperty(buyer, p) }))
        .filter((m) => m.match.ok)
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, MAX_MATCHES),
    [properties, buyer],
  );

  return (
    <PanelSection title={`מוכרים שמתאימים${matches.length ? ` (${matches.length})` : ""}`}>
      {isLoading ? null : matches.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4" />
          אין כרגע מוכרים שעומדים בכל הדרישות של הקונה
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.map(({ property: p, match }) => (
            <li key={p.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/properties?open=${p.id}`} className="font-medium hover:underline">
                  {formatAddress(p)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[p.neighborhood, p.rooms && `${p.rooms} חד׳`, p.floor != null && `קומה ${p.floor}`].filter(Boolean).join(" · ")}
                </p>
                <MatchReasons reasons={match.reasons} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money value={p.current_price} className="font-display text-base text-primary" />
                <WhatsAppButton
                  phone={buyer.phone}
                  text={propertyMessage(p, buyer.full_name)}
                  size="icon-sm"
                  label={`שלח ל${buyer.full_name} בוואטסאפ`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

