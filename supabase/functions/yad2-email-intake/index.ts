// Receives Yad2 alert emails from the Gmail script in remaxtabu@gmail.com and stores them in
// `inbound_emails` (once per Gmail message). The script sends its key in `x-intake-key`; the key's
// SHA-256 is in `intake_keys`. Each Yad2 alert not handled yet is then read into the pool
// (`market_listings`): only the office's area, and nothing that's already in the pool or among the sellers.
//
// The same script also emails the admins about new sign-ups: `{action: "signups"}` returns the
// requests not emailed yet (one per admin), and `{action: "signups-sent", ids}` marks them sent.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type AlertListing, parseYad2Alert } from "./parse.ts";

/** Only listings from here enter the pool (the alert's search should already be limited to it). */
const NEIGHBORHOODS = ["פסגת זאב"];

/** Yad2's type names → the CRM's, as in the Yad2 Plus import (frontend/src/components/market/yad2-import.ts). */
const TYPES: Record<string, string> = {
  "גג/ פנטהאוז": "פנטהאוז",
  "גג/פנטהאוז": "פנטהאוז",
  "בית פרטי/ קוטג'": "בית פרטי",
  "בית פרטי/קוטג'": "בית פרטי",
  "דו משפחתי": "דו-משפחתי",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Same as `addressKey` in frontend/src/components/market/yad2-import.ts: "שדרות משה דיין 5" = "משה דיין 5". */
function addressKey(street: string | null | undefined): string {
  return (street ?? "")
    .replace(/[\u200e\u200f\u00a0]/g, " ")
    .trim()
    .replace(/^(רחוב|רח'|שדרות|שד'|דרך)\s+/, "")
    .replace(/["'״׳\-.,]/g, "")
    .replace(/\s+/g, "");
}

type PoolRow = { url: string | null; street: string | null; price: number | null; rooms: number | null; property_type: string | null };

/** Reads every Yad2 alert not handled yet into the pool, and records what came of it. */
async function processAlerts() {
  const { data: emails } = await supabase.from("inbound_emails").select("id, sender, subject, html, sent_at").is("processed_at", null);
  if (!emails?.length) return;
  const [{ data: pool }, { data: sellers }] = await Promise.all([
    supabase.from("market_listings").select("url, street, price, rooms, property_type"),
    supabase.from("properties").select("street, house_number"),
  ]);
  const listings: PoolRow[] = pool ?? [];
  const sellerKeys = new Set((sellers ?? []).map((p) => addressKey(`${p.street ?? ""} ${p.house_number ?? ""}`)));

  const isKnown = (l: AlertListing, type: string | null) =>
    listings.some((p) => p.url?.includes(l.code)) ||
    sellerKeys.has(addressKey(l.street)) ||
    listings.some(
      (p) =>
        addressKey(p.street) === addressKey(l.street) &&
        ((l.price != null && Number(p.price) === l.price) || (l.rooms != null && Number(p.rooms) === l.rooms && (p.property_type ?? "") === (type ?? ""))),
    );

  for (const email of emails) {
    const isAlert = /@yad2\.co\.il/i.test(email.sender ?? "") && (email.subject ?? "").includes("התראות");
    let result: Record<string, unknown> = { skipped: "not an alert" };
    if (isAlert) {
      const found = parseYad2Alert(email.html ?? "");
      const day = new Date(email.sent_at ?? Date.now()).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });
      const rows = [];
      let duplicates = 0;
      let otherArea = 0;
      for (const l of found) {
        if (!NEIGHBORHOODS.some((n) => (l.neighborhood ?? "").startsWith(n))) {
          otherArea++;
          continue;
        }
        const type = l.type ? (TYPES[l.type] ?? l.type) : null;
        if (isKnown(l, type)) {
          duplicates++;
          continue;
        }
        const row = {
          source: "יד2",
          status: "new" as const,
          url: l.url,
          image_url: l.imageUrl,
          title: [type, l.rooms && `${l.rooms} חד׳`].filter(Boolean).join(" ") + `, ${l.street}`,
          property_type: type,
          city: "ירושלים",
          neighborhood: l.neighborhood,
          street: l.street,
          rooms: l.rooms,
          size_sqm: l.sizeSqm,
          price: l.price,
          ...(email.sent_at && { listed_at: email.sent_at }),
          notes: `נקלט מהתראת יד 2 ב-${day}. אין טלפון במייל: הוא יתווסף בייבוא מיד 2 פלוס, או מהמודעה.`,
        };
        rows.push(row);
        // A listing twice in one batch of emails enters once.
        listings.push({ url: l.url, street: l.street, price: l.price, rooms: l.rooms, property_type: type });
      }
      if (rows.length) {
        const { error } = await supabase.from("market_listings").insert(rows);
        if (error) {
          // Left unprocessed: the next run tries again.
          console.error("insert failed", email.id, error.message);
          continue;
        }
      }
      result = { found: found.length, added: rows.length, duplicates, otherArea };
    }
    await supabase.from("inbound_emails").update({ processed_at: new Date().toISOString(), result }).eq("id", email.id);
  }
}

const SITE = "https://remax-tabu.up.railway.app";

/** Sign-up requests (bell notifications) not emailed yet, addressed to their admin. */
async function pendingSignups() {
  const { data: notes, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, body, created_at")
    .eq("kind", "signup_request")
    .is("emailed_at", null);
  if (error) throw error;
  if (!notes?.length) return [];
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", [...new Set(notes.map((n) => n.recipient_id))])
    .eq("role", "admin")
    .eq("status", "active");
  const emailOf = new Map((admins ?? []).filter((a) => a.email).map((a) => [a.id, a.email as string]));
  return notes.flatMap((n) => {
    const to = emailOf.get(n.recipient_id);
    if (!to) return [];
    // The body is "name · phone · email" (handle_new_user).
    const name = (n.body ?? "").split(" · ")[0] || "סוכן חדש";
    return [{ id: n.id, to, subject: `סוכן חדש ממתין לאישור: ${name}`, details: n.body ?? "", link: `${SITE}/agents` }];
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

  let body: { action?: string; ids?: string[]; messageId?: string; from?: string; subject?: string; date?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad json" });
  }

  if (body.action === "signups") {
    try {
      return json(200, { signups: await pendingSignups() });
    } catch (e) {
      return json(500, { error: String((e as Error).message ?? e) });
    }
  }
  if (body.action === "signups-sent") {
    const ids = (body.ids ?? []).filter((id) => typeof id === "string");
    if (ids.length) {
      const { error } = await supabase.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", ids);
      if (error) return json(500, { error: error.message });
    }
    return json(200, { ok: true });
  }
  if (!body.messageId) return json(400, { error: "messageId required" });

  const { error } = await supabase.from("inbound_emails").upsert(
    {
      message_id: body.messageId,
      sender: body.from ?? null,
      subject: body.subject ?? null,
      sent_at: body.date ?? null,
      html: body.html ?? null,
    },
    { onConflict: "message_id", ignoreDuplicates: true },
  );
  if (error) return json(500, { error: error.message });
  // The email is stored either way; a failure here is retried on the next email.
  await processAlerts().catch((e) => console.error("processing failed", e));
  return json(200, { ok: true });
});
