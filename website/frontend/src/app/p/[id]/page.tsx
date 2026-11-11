import type { Metadata } from "next";
import { connection } from "next/server";
import { HomeContent } from "@/components/home-content";
import { getListing } from "@/lib/data";
import { listingPreview } from "@/lib/listings";

/**
 * The address the CRM sends to a buyer ("קישור לאתר" on a listing): the home page, opening with
 * that listing instead of a random one, the rest of the listings below as usual. The link's
 * preview (WhatsApp, Facebook) shows the listing itself. If the listing has left the site, this
 * is simply the home page.
 */
export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const l = await getListing(id);
  if (!l) return { alternates: { canonical: "/" } };
  const { title, description, image } = listingPreview(l);
  return {
    title,
    description,
    // For search engines this is the home page; only the preview is the listing's.
    alternates: { canonical: "/" },
    openGraph: { type: "website", title, description, url: `/p/${l.id}`, images: [image] },
  };
}

export default function HomeWithListingPage({ params, searchParams }: PageProps<"/p/[id]">) {
  // Searching keeps this address, so the listing the visitor was sent stays at the top.
  return <HomeContent searchParams={searchParams} first={params.then((p) => p.id)} base={params.then((p) => `/p/${encodeURIComponent(p.id)}`)} />;
}
