import { supabaseConfig } from "@/lib/env";

/**
 * A listing photo from the private property-media bucket. The publishable key may open a photo
 * only while its listing is on the site (database policy "property-media: website read"), so a
 * photo of any other property answers 404 here too.
 */
const PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.-]+$/i;

export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const key = path.map(decodeURIComponent).join("/");
  if (!PATH.test(key)) return new Response("Not found", { status: 404 });

  const { url, key: apiKey } = supabaseConfig();
  const upstream = await fetch(`${url}/storage/v1/object/authenticated/property-media/${key}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Short, so a listing that leaves the site stops showing its photos soon.
      "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
    },
  });
}
