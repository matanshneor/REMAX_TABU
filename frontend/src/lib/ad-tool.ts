import type { Property } from "./types";
import { propertyFeatures } from "./whatsapp";

/** The office's ad-making tool: a static page of this site (public/ad-tool), open without signing in. */
export const AD_TOOL_URL = "/ad-tool";

/**
 * Link that opens the ad tool already filled in for a property. The details go after the "#",
 * so they never reach a server; the tool reads them once and keeps them as its draft.
 * Leaves out the street, apartment number and owner details, like the WhatsApp message.
 */
export function adToolUrl(p: Property, agentPhone: string | null | undefined, imageUrls: string[]): string {
  const title = [[p.property_type ?? "נכס", p.rooms && `${p.rooms} חדרים`].filter(Boolean).join(" "), p.size_sqm && `${p.size_sqm} מ״ר`];
  const params = new URLSearchParams();
  params.set("type", title.filter(Boolean).join("\n"));
  params.set("location", `ב${[p.neighborhood, p.city].filter(Boolean).join(", ")}`);
  if (p.floor != null) params.set("sub", p.total_floors ? `קומה ${p.floor} מתוך ${p.total_floors}` : `קומה ${p.floor}`);
  params.set("info", propertyFeatures(p).join("\n"));
  if (p.current_price) params.set("price", String(p.current_price));
  if (agentPhone) params.set("agent", agentPhone);
  for (const url of imageUrls) params.append("img", url);
  return `${AD_TOOL_URL}#${params}`;
}
