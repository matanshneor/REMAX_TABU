"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";


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

export const myDismissalsKey = (userId: string | undefined) => ["market_listing_dismissals", userId];

/** "לא רלוונטי" is personal: the listings this user marked, with why and when. */
export function useMyDismissals() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: myDismissalsKey(profile?.id),
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await createClient().from("market_listing_dismissals").select("listing_id, reason, dismissed_at");
      if (error) throw error;
      return new Map(data.map((d) => [d.listing_id, d]));
    },
  });
}

/**
 * The listings this user already copied to their own sellers: listing id → their seller's id.
 * (The manager sees everyone's sellers, so it asks for their own explicitly.)
 */
export function useMyListingCopies() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["properties", "listing-copies", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("properties")
        .select("id, source_listing_id")
        .eq("recruiting_agent_id", profile!.id)
        .not("source_listing_id", "is", null);
      if (error) throw error;
      return new Map(data.map((p) => [p.source_listing_id!, p.id]));
    },
  });
}

export const myListingNotesKey = (userId: string | undefined) => ["market_listing_notes", userId];

/** This user's own notes on listings: listing id → the note. (Nobody else's are readable.) */
export function useMyListingNotes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: myListingNotesKey(profile?.id),
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await createClient().from("market_listing_notes").select("listing_id, notes, updated_at");
      if (error) throw error;
      return new Map(data.map((n) => [n.listing_id, n]));
    },
  });
}
