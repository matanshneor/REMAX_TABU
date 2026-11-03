"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";

/** Still to call ("contacted" is from before the two outcomes; it stays open). */
export const isOpenListing = (l: MarketListing) => l.status === "new" || l.status === "contacted";

/** The pool, newest in the pool first. Shared by the pool page and the menu's count. */
export function useMarketListings() {
  return useQuery({
    queryKey: ["market_listings", "list"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("market_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .order("listed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export const seenListingsKey = (userId: string | undefined) => ["market_listing_views", userId];

/** Listings the signed-in user has opened (null until loaded); the rest are "חדשה" for them. */
export function useSeenListings() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: seenListingsKey(profile?.id),
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await createClient().from("market_listing_views").select("listing_id");
      if (error) throw error;
      return new Set(data.map((v) => v.listing_id));
    },
  });
}
