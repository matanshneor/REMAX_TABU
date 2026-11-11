import type { Property } from "./types";

/** The public listings site (the website/ app). Set NEXT_PUBLIC_WEBSITE_URL if its address changes. */
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://remaxtabu.up.railway.app").replace(/\/+$/, "");

/**
 * Is this property on the site right now? The manager puts a property on the site ("העלאה
 * לאתר"); the same rule as the database view the site reads (website_properties).
 */
export function isOnWebsite(p: Pick<Property, "on_website" | "status">): boolean {
  return p.on_website && p.status === "active";
}

/**
 * The link to send a buyer: the listing's own page on the site (photos, details, enquiry form).
 * Null when the property isn't on the site.
 */
export function websiteLink(p: Pick<Property, "id" | "on_website" | "status">): string | null {
  return isOnWebsite(p) ? `${WEBSITE_URL}/properties/${p.id}` : null;
}
