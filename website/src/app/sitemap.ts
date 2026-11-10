import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getListings } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await getListings();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...listings.map((l) => ({
      url: `${SITE_URL}/properties/${l.id}`,
      lastModified: l.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/accessibility`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
