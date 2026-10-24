import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { icsCalendar } from "@/lib/calendar";
import type { Database } from "@/lib/supabase/database.types";

const EVENT_MINUTES = 30;

/**
 * Calendar subscription feed (/api/calendar/<token>.ics). Phone calendars fetch it without
 * signing in; the personal token is the key, and the database returns only that user's
 * open, dated tasks. An unknown token gets an empty calendar rather than an error, so a
 * replaced link just goes quiet.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/calendar/[token]">) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("calendar_feed", { p_token: token });
  if (error) return new Response("Calendar unavailable", { status: 503 });

  // Behind Railway's proxy the request URL is internal; links must use the public address.
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const body = icsCalendar(
    (data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      start: new Date(t.due_at),
      duration: EVENT_MINUTES,
      details: [t.description, t.related, `פתיחה במערכת: ${origin}/tasks?open=${t.id}`].filter(Boolean).join("\n"),
      url: `${origin}/tasks?open=${t.id}`,
      version: Math.floor(new Date(t.updated_at).getTime() / 1000),
    })),
    "משימות – רימקס טאבו",
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="remax-tabu-tasks.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
