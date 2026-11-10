/** Settings from the environment (see .env.example). Server-only values never reach the browser. */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  return { url: url.replace(/\/$/, ""), key };
}

export const CRM_URL = (process.env.CRM_URL || "https://remax-tabu.up.railway.app").replace(/\/$/, "");
