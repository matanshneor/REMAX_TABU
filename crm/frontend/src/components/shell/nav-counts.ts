"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { useMarketListings, useMyDismissals, useSeenListings } from "@/components/market/use-market";
import { createClient } from "@/lib/supabase/client";

/** What the sidebar shows: new Yad2 listings (as a line under the item) and sign-ups to approve. */
export function useNavCounts() {
  const { profile } = useAuth();
  const supabase = createClient();

  // Yad2 pool listings this user hasn't opened yet, leaving out those they marked "לא רלוונטי"
  // (same queries as the pool page, so opening a listing there updates this at once).
  const { data: listings } = useMarketListings();
  const { data: seen } = useSeenListings();
  const { data: dismissed } = useMyDismissals();
  const unseen =
    listings && seen && dismissed ? listings.filter((l) => !dismissed.has(l.id) && !seen.has(l.id)).length : undefined;

  // Sign-ups waiting for the admin; only admins can see other people's pending profiles.
  const pending = useQuery({
    queryKey: ["profiles", "count", "pending"],
    enabled: profile?.role === "admin",
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    "/market": unseen,
    "/agents": pending.data,
  } as Record<string, number | undefined>;
}
