// Emails the office manager about enquiries from the public website (website/). The enquiry itself
// is saved by the backend (POST /public/leads) as a buyer, a task and a bell notification of kind
// `website_lead`; this function hands the notifications not emailed yet to the Gmail script in
// remaxtabu@gmail.com (every minute), which sends them, then marks them sent. Railway's plan blocks
// SMTP, so the email can't go out from the backend.
//
// Same key as yad2-email-intake: the script sends it in `x-intake-key`; its SHA-256 is in `intake_keys`.
//   {action: "leads"}            -> {leads: [{id, to, subject, name, phone, message, property, crmLink, propertyLink}]}
//   {action: "leads-sent", ids}  -> marks them sent
import { createClient } from "jsr:@supabase/supabase-js@2";

const CRM = "https://remax-tabu.up.railway.app";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only enquiries from the last 2 days: an old unsent one is not worth an email days later. */
async function pendingLeads() {
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: notes, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, title, body, link, created_at")
    .eq("kind", "website_lead")
    .is("emailed_at", null)
    .gte("created_at", since)
    .order("created_at");
  if (error) throw error;
  if (!notes?.length) return [];

  const { data: people } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", [...new Set(notes.map((n) => n.recipient_id))])
    .eq("status", "active");
  const emailOf = new Map((people ?? []).filter((p) => p.email).map((p) => [p.id, p.email as string]));

  const buyerOf = (link: string | null) => link?.match(/open=([0-9a-f-]{36})/i)?.[1] ?? null;
  const buyerIds = notes.map((n) => buyerOf(n.link)).filter((x): x is string => !!x);
  const { data: buyers } = buyerIds.length
    ? await supabase.from("buyers").select("id, full_name, phone, notes").in("id", buyerIds)
    : { data: [] };
  const buyer = new Map((buyers ?? []).map((b) => [b.id, b]));

  return notes.flatMap((n) => {
    const to = emailOf.get(n.recipient_id);
    if (!to) return [];
    const b = buyer.get(buyerOf(n.link) ?? "");
    // The buyer's notes: "פנייה מהאתר\n<message>\nנכס: <label>\n<link>" (backend leads.py).
    const lines = (b?.notes ?? "").split("\n").slice(1);
    const propertyLink = lines.find((l) => l.startsWith("http")) ?? "";
    const property = (lines.find((l) => l.startsWith("נכס: ")) ?? "").replace("נכס: ", "");
    const message = lines.filter((l) => !l.startsWith("נכס: ") && l !== propertyLink).join("\n");
    return [
      {
        id: n.id,
        to,
        subject: n.title,
        name: b?.full_name ?? "",
        phone: b?.phone ?? "",
        message,
        property,
        propertyLink,
        crmLink: `${CRM}${n.link ?? "/buyers"}`,
      },
    ];
  });
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const key = req.headers.get("x-intake-key") ?? "";
  const { data: keys } = await supabase.from("intake_keys").select("key_sha256");
  const hash = key ? await sha256(key) : "";
  if (!hash || !keys?.some((k) => k.key_sha256 === hash)) return json(401, { error: "bad key" });

  let body: { action?: string; ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad json" });
  }

  if (body.action === "leads") {
    try {
      return json(200, { leads: await pendingLeads() });
    } catch (e) {
      return json(500, { error: String((e as Error).message ?? e) });
    }
  }
  if (body.action === "leads-sent") {
    const ids = (body.ids ?? []).filter((id) => typeof id === "string");
    if (ids.length) {
      const { error } = await supabase
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .in("id", ids)
        .eq("kind", "website_lead");
      if (error) return json(500, { error: error.message });
    }
    return json(200, { ok: true });
  }
  return json(400, { error: "unknown action" });
});
