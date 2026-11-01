import type { Property } from "./types";

/** The office's ad-making tool (a separate site). */
export const AD_TOOL_URL = "https://matanshneor.github.io/Remax-Template/";

/**
 * Link that opens the ad tool already filled in for a property. The details go after the "#",
 * so they never reach a server; the tool reads them once and keeps them as its draft.
 * Leaves out the street, apartment number and owner details, like the WhatsApp message.
 */
export function adToolUrl(p: Property, agentPhone: string | null | undefined, imageUrls: string[]): string {
  const title = [[p.property_type ?? "נכס", p.rooms && `${p.rooms} חדרים`].filter(Boolean).join(" "), p.size_sqm && `${p.size_sqm} מ״ר`];
  const features = [
    p.has_safe_room && "ממ״ד",
    p.has_balcony && "מרפסת",
    p.parking_spots > 0 && (p.parking_spots > 1 ? `${p.parking_spots} חניות` : "חניה"),
    p.has_elevator && "מעלית",
    p.has_storage && "מחסן",
    p.is_renovated && "משופצת",
  ];

  const params = new URLSearchParams();
  params.set("type", title.filter(Boolean).join("\n"));
  params.set("location", `ב${[p.neighborhood, p.city].filter(Boolean).join(", ")}`);
  if (p.floor != null) params.set("sub", p.total_floors ? `קומה ${p.floor} מתוך ${p.total_floors}` : `קומה ${p.floor}`);
  params.set("info", features.filter(Boolean).join("\n"));
  if (p.current_price) params.set("price", String(p.current_price));
  if (agentPhone) params.set("agent", agentPhone);
  for (const url of imageUrls) params.append("img", url);
  return `${AD_TOOL_URL}#${params}`;
}
