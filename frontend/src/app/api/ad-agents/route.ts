import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * The agents for the ad tool (/ad-tool), which is open without signing in: the office team list,
 * limited to what every ad already prints (name, role, license, phone, photo).
 */
export async function GET() {
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("ad_tool_agents");
  if (error) return Response.json({ error: "agents unavailable" }, { status: 503 });

  const agents = data.map((a) => ({
    name: a.name,
    role: a.role ?? 'סוכן/ת נדל"ן',
    license: a.license,
    phone: a.phone,
    photo: a.photo_url,
  }));
  return Response.json(agents, { headers: { "Cache-Control": "no-store" } });
}
