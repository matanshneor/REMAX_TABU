"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Enum } from "@/lib/types";

/**
 * A property the office offers, as every agent may see it for matching: facts and whose
 * listing it is, without the address or the seller (sellers are private to their agent).
 */
export type OfficeListing = {
  id: string;
  recruiting_agent_id: string | null;
  agent_name: string | null;
  status: Enum<"property_status">;
  engagement: Enum<"property_engagement">;
  property_type: string | null;
  neighborhood: string | null;
  city: string | null;
  rooms: number | null;
  size_sqm: number | null;
  floor: number | null;
  current_price: number | null;
  has_balcony: boolean;
  has_elevator: boolean;
  has_safe_room: boolean;
};

export function useOfficeListings() {
  return useQuery({
    queryKey: ["properties", "office-listings"],
    queryFn: async (): Promise<OfficeListing[]> => {
      const { data, error } = await createClient().rpc("office_listings");
      if (error) throw error;
      return data as OfficeListing[];
    },
  });
}
