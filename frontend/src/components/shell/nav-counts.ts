"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

/** What the sidebar shows: new Yad2 listings (as a line under the item) and sign-ups to approve. */
export function useNavCounts() {
  const { profile } = useAuth();
  const supabase = createClient();

  const listings = useQuery({
    queryKey: ["market_listings", "count", "new"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("market_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
  });

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
    "/market": listings.data,
    "/agents": pending.data,
  } as Record<string, number | undefined>;
}
