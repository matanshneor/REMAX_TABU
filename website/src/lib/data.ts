import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { supabaseConfig } from "./env";
import type { Agent, Listing } from "./listings";

/** Server only: reads the two website views with the publishable key, cached until the CRM changes. */

/** Tags the database refresh call (POST /api/revalidate) expires. */
export const TAGS = { listings: "listings", agent: "agent" } as const;

function db() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const NEW_DAYS = 7;

// Each change in the CRM expires these at once (the refresh call); the timed refresh is only a safety net.
const LIFE = { stale: 60, revalidate: 600, expire: 3600 };

/** All the agent's listings on the site, newest first. */
export async function getListings(): Promise<Listing[]> {
  "use cache";
  cacheTag(TAGS.listings);
  cacheLife(LIFE);
  const { data, error } = await db().from("website_properties").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`website_properties: ${error.message}`);
  // Inside the cache, so the time is the fetch time (pages stay deterministic).
  const now = Date.now();
  return (data ?? []).map((r) => ({
    ...r,
    rooms: r.rooms == null ? null : Number(r.rooms),
    size_sqm: r.size_sqm == null ? null : Number(r.size_sqm),
    current_price: r.current_price == null ? null : Number(r.current_price),
    balcony_sqm: r.balcony_sqm == null ? null : Number(r.balcony_sqm),
    garden_sqm: r.garden_sqm == null ? null : Number(r.garden_sqm),
    image_paths: r.image_paths ?? [],
    is_new: now - new Date(r.created_at).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000,
  })) as Listing[];
}

export async function getListing(id: string): Promise<Listing | null> {
  return (await getListings()).find((l) => l.id === id) ?? null;
}

export async function getAgent(): Promise<Agent> {
  "use cache";
  cacheTag(TAGS.agent);
  cacheLife(LIFE);
  const { data, error } = await db().from("website_agent").select("*").maybeSingle();
  if (error) throw new Error(`website_agent: ${error.message}`);
  return (data as Agent | null) ?? { full_name: "משה שניאור", phone: null, email: null, photo_url: null };
}

