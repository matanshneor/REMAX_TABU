"use client";

import { isActiveBuyer, isOffered } from "@/lib/labels";
import { useQuery } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PanelSection } from "@/components/crm/panel";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { formatILSCompact } from "@/lib/format";
import { matchBuyerToProperty } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";
import type { Buyer, Property } from "@/lib/types";
import { propertyMessage } from "@/lib/whatsapp";
import { MatchReasons } from "./match-reasons";

const MAX_MATCHES = 10;

/**
 * In a seller's card: buyers this property fits. RLS limits the list to the
 * signed-in agent's own buyers (the admin sees everyone's).
 */
export function BuyerMatches({ property }: { property: Property }) {
  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ["buyers", "for-matching"],
    queryFn: async (): Promise<Buyer[]> => {
      const { data, error } = await createClient().from("buyers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const matches = useMemo(
    () =>
      buyers
        .filter(isActiveBuyer) // a buyer who already bought isn't a match anymore
        .map((b) => ({ buyer: b, match: matchBuyerToProperty(b, property) }))
        .filter((m) => m.match.ok)
        .sort((a, b) => b.match.score - a.match.score)
        .slice(0, MAX_MATCHES),
    [buyers, property],
  );

  return (
    <PanelSection title={`קונים שמתאימים${matches.length ? ` (${matches.length})` : ""}`}>
      {isLoading ? null : matches.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4" />
          {isOffered(property)
            ? "אין כרגע קונים שהנכס עונה על כל הדרישות שלהם"
            : property.engagement === "recruiting"
              ? "הנכס בתהליך גיוס: יוצע לקונים אחרי שתהיה בלעדיות או הסכמה"
              : "התאמות מוצגות רק לנכסים פעילים"}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {matches.map(({ buyer: b, match }) => (
            <li key={b.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/buyers?open=${b.id}`} className="font-medium hover:underline">
                  {b.full_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[b.max_budget != null && `עד ${formatILSCompact(b.max_budget)}`, b.min_rooms && `${b.min_rooms}+ חד׳`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <MatchReasons reasons={match.reasons} />
              </div>
              <WhatsAppButton phone={b.phone} text={propertyMessage(property, b.full_name)} size="icon-sm" label={`שלח ל${b.full_name} בוואטסאפ`} />
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
