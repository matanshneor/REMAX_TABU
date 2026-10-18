"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Deals with their linked property and buyer. RLS: the admin gets all, an agent only their own. */
export function useDeals() {
  return useQuery({
    queryKey: ["deals", "list"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("deals")
        .select("*, properties(id, street, house_number, apartment_number, city), buyers(id, full_name)")
        .order("closed_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type DealRow = NonNullable<ReturnType<typeof useDeals>["data"]>[number];
