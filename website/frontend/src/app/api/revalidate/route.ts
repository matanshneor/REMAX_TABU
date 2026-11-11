import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data";

/**
 * Called by the database (trigger zz_website_refresh, through pg_net) whenever a listing on
 * the site or the team's details change. The shared secret is in Vault (website_revalidate_secret)
 * and in REVALIDATE_SECRET here. The next visit then gets fresh pages.
 */
function secretOk(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { table?: string };
  // A listing carries its agent's contact details, so a change in the team refreshes both.
  const tags = body.table === "properties" ? [TAGS.listings] : [TAGS.agent, TAGS.listings];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
