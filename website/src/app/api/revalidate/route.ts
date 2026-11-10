import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data";

/**
 * Called by the database (trigger zz_website_refresh, through pg_net) whenever the agent's
 * listings or contact details change. The shared secret is in Vault (website_revalidate_secret)
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
  const tags = body.table === "properties" ? [TAGS.listings] : [TAGS.agent];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
