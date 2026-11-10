import { CRM_URL } from "./env";

/** A row of the website_properties view: public fields only (no house number, seller, agents). */
export type Listing = {
  id: string;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  property_type: string | null;
  floor: number | null;
  total_floors: number | null;
  rooms: number | null;
  size_sqm: number | null;
  current_price: number | null;
  eviction_date: string | null;
  eviction_immediate: boolean;
  has_safe_room: boolean;
  has_balcony: boolean;
  balcony_count: number | null;
  balcony_sqm: number | null;
  parking_spots: number;
  has_elevator: boolean;
  has_storage: boolean;
  is_renovated: boolean;
  has_garden: boolean;
  garden_sqm: number | null;
  has_rental_unit: boolean;
  description: string | null;
  image_paths: string[];
  created_at: string;
  updated_at: string;
  /** On the market for less than a week ("חדש בשוק"); worked out when the list is fetched. */
  is_new: boolean;
};

export type Agent = { full_name: string; phone: string | null; email: string | null; photo_url: string | null };

// ---------------------------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------------------------

/** Types with no "floor" to speak of: houses and land. */
const NO_FLOOR_TYPES = new Set(["בית פרטי", "קוטג׳", "קוטג'", "דו-משפחתי", "וילה", "מגרש"]);
export const HOUSE_TYPES = ["בית פרטי", "קוטג׳", "דו-משפחתי", "וילה"];
export const APARTMENT_TYPES = ["דירה", "דירת גן", "פנטהאוז", "דופלקס", "טריפלקס"];

export function hasFloor(l: Listing): boolean {
  return l.floor != null && !NO_FLOOR_TYPES.has(l.property_type ?? "");
}

/** Photo URL on this site (the /media route reads it from the private bucket). */
export function photoUrl(path: string): string {
  return `/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function agentPhotoUrl(agent: Agent): string | null {
  if (!agent.photo_url) return null;
  return agent.photo_url.startsWith("/") ? `${CRM_URL}${agent.photo_url}` : agent.photo_url;
}

export function formatPrice(n: number | null): string {
  return n == null ? "המחיר לפי פנייה" : `${n.toLocaleString("he-IL")} ₪`;
}

export function formatRooms(r: number | null): string {
  if (r == null) return "";
  return Number.isInteger(r) ? String(r) : r.toLocaleString("he-IL");
}

/** "דירת גן ברחוב הרב בצלאל", or "דירת גן בגילה" without a street. */
export function listingName(l: Listing): string {
  const type = l.property_type || "נכס";
  if (l.street) return `${type} ברחוב ${l.street}`;
  if (l.neighborhood) return `${type} ב${l.neighborhood}`;
  return type;
}

/** "גילה, ירושלים" */
export function listingPlace(l: Listing): string {
  return [l.neighborhood, l.city].filter(Boolean).join(", ");
}

/** The listing's features, as short Hebrew labels. */
export function listingFeatures(l: Listing): string[] {
  const out: string[] = [];
  if (l.has_safe_room) out.push("ממ״ד");
  if (l.has_elevator) out.push("מעלית");
  if (l.parking_spots > 0) out.push(l.parking_spots === 1 ? "חניה" : `${l.parking_spots} חניות`);
  if (l.has_balcony) {
    const count = l.balcony_count && l.balcony_count > 1 ? `${l.balcony_count} מרפסות` : "מרפסת";
    out.push(l.balcony_sqm ? `${count} (${formatRooms(l.balcony_sqm)} מ״ר)` : count);
  }
  if (l.has_garden) out.push(l.garden_sqm ? `גינה (${formatRooms(l.garden_sqm)} מ״ר)` : "גינה");
  if (l.has_storage) out.push("מחסן");
  if (l.has_rental_unit) out.push("יחידת דיור");
  if (l.is_renovated) out.push("משופץ");
  return out;
}

/** "כניסה מיידית" / "כניסה: 1.3.2027" / null */
export function entryText(l: Listing): string | null {
  if (l.eviction_immediate) return "מיידית";
  if (!l.eviction_date) return null;
  const d = new Date(`${l.eviction_date}T00:00:00`);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

/** Up to `n` other listings: same neighborhood first, then the closest price. */
export function similarListings(all: Listing[], l: Listing, n = 3): Listing[] {
  const price = l.current_price ?? 0;
  return all
    .filter((o) => o.id !== l.id)
    .map((o) => ({
      o,
      score:
        (o.neighborhood && o.neighborhood === l.neighborhood ? 0 : 1) * 10 +
        (price && o.current_price ? Math.abs(o.current_price - price) / price : 5),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.o);
}
