// Receives Yad2 alert emails from the Gmail script in remaxtabu@gmail.com and stores them in
// `inbound_emails` (once per Gmail message). The script sends its key in `x-intake-key`; the key's
// SHA-256 is in `intake_keys`. Reading the listings into the pool comes in a later step.
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const key = req.headers.get("x-intake-key") ?? "";
  const { data: keys } = await supabase.from("intake_keys").select("key_sha256");
  const hash = key ? await sha256(key) : "";
  if (!hash || !keys?.some((k) => k.key_sha256 === hash)) return json(401, { error: "bad key" });

  let body: { messageId?: string; from?: string; subject?: string; date?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad json" });
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
  return json(200, { ok: true });
});
