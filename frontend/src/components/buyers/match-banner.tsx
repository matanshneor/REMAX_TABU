"use client";

import { useQuery } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";
import { useMemo } from "react";
import { matchBuyerToProperty } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";
import type { Buyer, Property } from "@/lib/types";

/** Under the buyers table: which of the user's open buyers have matching sellers right now. */
export function MatchBanner({ buyers, onOpen }: { buyers: Buyer[]; onOpen: (id: string) => void }) {
  const { data: properties = [] } = useQuery({
    queryKey: ["properties", "active-for-matching"],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await createClient().from("properties").select("*").eq("status", "active").neq("engagement", "recruiting");
      if (error) throw error;
      return data;
    },
  });

  const withMatches = useMemo(
    () =>
      buyers
        .map((b) => ({ buyer: b, count: properties.filter((p) => matchBuyerToProperty(b, p).ok).length }))
        .filter((m) => m.count > 0)
        .sort((a, b) => b.count - a.count),
    [buyers, properties],
  );

  if (withMatches.length === 0) return null;
  const total = withMatches.reduce((n, m) => n + m.count, 0);

  return (
    <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-primary/15 bg-gradient-to-l from-secondary/80 to-card p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <SparklesIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">התאמה אוטומטית למאגר המוכרים</p>
        <p className="text-sm text-muted-foreground">
          נמצאו {total} {total === 1 ? "התאמה" : "התאמות"} עבור {withMatches.length}{" "}
          {withMatches.length === 1 ? "קונה" : "קונים"} — לחץ על קונה כדי לראות את המוכרים שמתאימים לו.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {withMatches.slice(0, 4).map(({ buyer, count }) => (
          <button
            key={buyer.id}
            type="button"
            onClick={() => onOpen(buyer.id)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary hover:text-primary"
          >
            {buyer.full_name}
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white tabular-nums">
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
