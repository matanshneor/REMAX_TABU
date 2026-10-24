import type { NextRequest } from "next/server";
import { icsCalendar } from "@/lib/calendar";
import { formatAddress } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const EVENT_MINUTES = 30;

/** Embedded relations come back as an object or a one-item list depending on the client typing. */
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

/**
 * One task as a calendar event, served from a real address (/api/calendar/task/<id>.ics) so an
 * iPhone opens it straight in its "add event" screen instead of saving a file. Uses the
 * signed-in session: tasks are private, so only the owner gets a result.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/calendar/task/[id]">) {
  const id = (await ctx.params).id.replace(/\.ics$/, "");
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, buyers(full_name, phone), properties(street, house_number, apartment_number, city), candidates(full_name, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!task?.due_at) return new Response("המשימה לא נמצאה או שאין לה מועד", { status: 404 });

  // Behind Railway's proxy the request URL is internal; links must use the public address.
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${host}/tasks?open=${task.id}`;

  const buyer = one(task.buyers);
  const property = one(task.properties);
  const candidate = one(task.candidates);
  const related = [
    buyer && `קונה: ${buyer.full_name}${buyer.phone ? ` (${buyer.phone})` : ""}`,
    property && `נכס: ${formatAddress(property)}, ${property.city}`,
    candidate && `מועמד: ${candidate.full_name}${candidate.phone ? ` (${candidate.phone})` : ""}`,
  ];
  const body = icsCalendar([
    {
      id: task.id,
      title: task.title,
      start: new Date(task.due_at),
      duration: EVENT_MINUTES,
      details: [task.description, ...related, `פתיחה במערכת: ${url}`].filter(Boolean).join("\n"),
      url,
    },
  ]);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="task.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
