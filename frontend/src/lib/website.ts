import type { Property } from "./types";

/** The public listings site (the website/ app). Set NEXT_PUBLIC_WEBSITE_URL if its address changes. */
export const WEBSITE_URL = (process.env.NEXT_PUBLIC_WEBSITE_URL || "https://remaxtabu.up.railway.app").replace(/\/+$/, "");

/** The agent whose listings the site shows: the manager's row in the team list (office_agents). */
const WEBSITE_AGENT_ID = process.env.NEXT_PUBLIC_WEBSITE_AGENT_ID || "63a51f45-fdef-4797-855d-12d8b9405960";

/**
 * Is this property on the site right now? The same rule as the database view the site reads
 * (website_properties): the manager's listing, on the market, past the recruiting stage.
 */
export function isOnWebsite(p: Pick<Property, "recruiter_id" | "status" | "engagement">): boolean {
  return p.recruiter_id === WEBSITE_AGENT_ID && p.status === "active" && p.engagement !== "recruiting";
}

/**
 * The link to send a buyer: the site's home page, opening with this listing (the rest of the
 * listings are right below it). Null when the property isn't on the site.
 */
export function websiteLink(p: Pick<Property, "id" | "recruiter_id" | "status" | "engagement">): string | null {
  return isOnWebsite(p) ? `${WEBSITE_URL}/p/${p.id}` : null;
}
