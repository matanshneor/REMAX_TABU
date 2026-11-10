import { SITE_URL } from "./env";
import { formatPrice, type Listing } from "./listings";

/** "052-811-0611" → "972528110611" for wa.me links. */
export function intlPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `972${d.slice(1)}` : d;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function listingUrl(l: Pick<Listing, "id">): string {
  return `${SITE_URL}/properties/${l.id}`;
}

/** "דירת גן ברחוב הרב בצלאל": the type, then the street (or the neighborhood). */
function typeAndStreet(l: Listing): string {
  const type = l.property_type || "נכס";
  if (l.street) return `${type} ברחוב ${l.street}`;
  if (l.neighborhood) return `${type} ב${l.neighborhood}`;
  return type;
}

/** Opens a chat with the agent: "היי משה, אני מתעניין בדירת גן ברחוב הרב בצלאל (2,500,000 ₪) <link>" */
export function whatsappToAgent(phone: string, l?: Listing, firstName = "משה"): string {
  const text = l
    ? `היי ${firstName}, אני מתעניין ב${typeAndStreet(l)} (${formatPrice(l.current_price)}) ${listingUrl(l)}`
    : `היי ${firstName}, הגעתי מהאתר ואשמח לשמוע על נכסים.`;
  return `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`;
}

/** Shares a listing with anyone (WhatsApp picks the contact). */
export function whatsappShare(l: Listing): string {
  const text = `${typeAndStreet(l)} · ${formatPrice(l.current_price)}\n${listingUrl(l)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
