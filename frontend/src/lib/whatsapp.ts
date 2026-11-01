import { formatILS } from "./format";
import type { Property } from "./types";

/** Israeli phone → international digits for wa.me (050-1234567 → 972501234567). */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("972")) return digits.length >= 11 ? digits : null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  // 9 digits = mobile (50-1234567), 8 digits = landline (3-6123456).
  return digits.length === 9 || digits.length === 8 ? `972${digits}` : null;
}

/** wa.me link. Without a phone, WhatsApp asks which contact to send to. */
export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  if (!phone) return `https://wa.me/${query}`;
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}${query}` : null;
}

export function openWhatsApp(phone: string | null | undefined, text?: string) {
  const url = whatsappUrl(phone, text);
  if (url) window.open(url, "_blank", "noopener");
}

/** The property's features as short phrases: "ממ״ד", "2 מרפסות (20 מ״ר)", "גינה 80 מ״ר"... */
export function propertyFeatures(p: Property): string[] {
  const sqm = (n: number | null) => (n ? ` ${n} מ״ר` : "");
  const balconies = (p.balcony_count ?? 0) > 1 ? `${p.balcony_count} מרפסות` : "מרפסת";
  return [
    p.has_safe_room && "ממ״ד",
    p.has_balcony && (p.balcony_sqm ? `${balconies} (${p.balcony_sqm} מ״ר)` : balconies),
    p.has_garden && `גינה${sqm(p.garden_sqm)}`,
    p.parking_spots > 0 && (p.parking_spots > 1 ? `${p.parking_spots} חניות` : "חניה"),
    p.has_elevator && "מעלית",
    p.has_storage && "מחסן",
    p.is_renovated && "משופצת",
  ].filter((f): f is string => !!f);
}

/** Ready-to-send property summary. Leaves out the apartment number and owner details. */
export function propertyMessage(p: Property, greetingName?: string): string {
  const features = propertyFeatures(p);
  const specs = [
    p.rooms && `${p.rooms} חדרים`,
    p.size_sqm && `${p.size_sqm} מ״ר`,
    p.floor != null && (p.total_floors ? `קומה ${p.floor} מתוך ${p.total_floors}` : `קומה ${p.floor}`),
  ].filter(Boolean);
  const address = [[p.street, p.house_number].filter(Boolean).join(" "), p.neighborhood, p.city].filter(Boolean).join(", ");

  return [
    greetingName ? `היי ${greetingName.split(" ")[0]}, יש לי נכס שיכול לעניין אותך:` : "נכס שיכול לעניין אותך:",
    "",
    `🏠 ${p.property_type ?? "נכס"} למכירה`,
    `📍 ${address}`,
    specs.length ? `📐 ${specs.join(" · ")}` : null,
    p.current_price ? `💰 ${formatILS(p.current_price)}` : null,
    features.length ? `✨ ${features.join(" · ")}` : null,
    p.virtual_tour_url ? `🎥 סיור וירטואלי: ${p.virtual_tour_url}` : null,
    "",
    "אשמח לתאם צפייה 🙂",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
