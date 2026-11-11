import { CRM_URL } from "./env";

/** A row of the website_properties view: public fields only (the address yes; the seller and the agents no). */
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
  /** Public since 11.11.2026 (migration website_address_and_backend); absent before it ran. */
  house_number?: string | null;
  apartment_number?: string | null;
  /** Public since migration website_more_details; absent before it ran. */
  garden_count?: number | null;
  rental_unit_count?: number | null;
  rental_unit_sqm?: number | null;
  /** The listing's own agent (migration website_publish); absent before it ran. */
  agent_name?: string | null;
  agent_title?: string | null;
  agent_phone?: string | null;
  agent_email?: string | null;
  agent_photo_url?: string | null;
  agent_license?: string | null;
  /** On the market for less than a week ("חדש בשוק"); worked out when the list is fetched. */
  is_new: boolean;
};

export type Agent = {
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  /** "זכיין", "סוכנת נדל"ן"… as on the office's ads. */
  title?: string | null;
  license?: string | null;
  /** A few words about the agent, written in the CRM. */
  bio?: string | null;
  is_manager?: boolean;
};

/** The agent whose listing this is; the office manager when the listing names nobody. */
export function listingAgent(l: Listing, manager: Agent): Agent {
  if (!l.agent_name) return manager;
  return {
    full_name: l.agent_name,
    title: l.agent_title,
    phone: l.agent_phone ?? null,
    email: l.agent_email ?? null,
    photo_url: l.agent_photo_url ?? null,
    license: l.agent_license,
  };
}

/** Hebrew verbs follow the agent: "משה יחזור אליכם", "אפרת תחזור אליכם". Read from the title. */
export function isFemale(agent: Pick<Agent, "title">): boolean {
  return /סוכנת|זכיינית|מנהלת/.test(agent.title ?? "");
}

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

/** "הרב בצלאל 12" (the street and house number). */
export function streetAddress(l: Listing): string {
  return [l.street?.replace(/\s+/g, " ").trim(), l.house_number?.trim()].filter(Boolean).join(" ");
}

/** "הרב בצלאל 12, דירה 3, גילה, ירושלים" */
export function fullAddress(l: Listing): string {
  const apt = l.apartment_number?.trim();
  return [streetAddress(l), apt && `דירה ${apt}`, l.neighborhood, l.city].filter(Boolean).join(", ");
}

/** "דירת גן ברחוב הרב בצלאל 12", or "דירת גן בגילה" without a street. */
export function listingName(l: Listing): string {
  const type = l.property_type || "נכס";
  if (l.street) return `${type} ברחוב ${streetAddress(l)}`;
  if (l.neighborhood) return `${type} ב${l.neighborhood}`;
  return type;
}

/** "גילה, ירושלים" */
export function listingPlace(l: Listing): string {
  return [l.neighborhood, l.city].filter(Boolean).join(", ");
}

/** "גינה (80 מ״ר)" / "2 מרפסות (30 מ״ר)": one or several of something, with its size when known. */
function counted(count: number | null | undefined, one: string, many: string, sqm: number | null | undefined): string {
  const what = (count ?? 0) > 1 ? `${count} ${many}` : one;
  return sqm ? `${what} (${formatRooms(sqm)} מ״ר)` : what;
}

/** The listing's features, as short Hebrew labels (cards, the opening, the WhatsApp text). */
export function listingFeatures(l: Listing): string[] {
  const out: string[] = [];
  if (l.has_safe_room) out.push("ממ״ד");
  if (l.has_elevator) out.push("מעלית");
  if (l.parking_spots > 0) out.push(l.parking_spots === 1 ? "חניה" : `${l.parking_spots} חניות`);
  if (l.has_balcony) out.push(counted(l.balcony_count, "מרפסת", "מרפסות", l.balcony_sqm));
  if (l.has_garden) out.push(counted(l.garden_count, "גינה", "גינות", l.garden_sqm));
  if (l.has_storage) out.push("מחסן");
  if (l.has_rental_unit) out.push(counted(l.rental_unit_count, "יחידת דיור", "יחידות דיור", l.rental_unit_sqm));
  if (l.is_renovated) out.push("משופץ");
  return out;
}

/**
 * The three facts a card shows under the listing's name: rooms, size, and the one thing that says
 * most about this kind of home (a garden when there is one, otherwise the floor, a balcony,
 * parking, or the safe room).
 */
export function cardFacts(l: Listing): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (l.rooms != null) facts.push({ label: "חדרים", value: formatRooms(l.rooms) });
  if (l.size_sqm != null) facts.push({ label: "שטח", value: `${formatRooms(l.size_sqm)} מ״ר` });
  const sized = (sqm: number | null | undefined, count: number | null | undefined) =>
    sqm ? `${formatRooms(sqm)} מ״ר` : count && count > 1 ? String(count) : "יש";
  if (l.has_garden) facts.push({ label: "גינה", value: sized(l.garden_sqm, l.garden_count) });
  else if (hasFloor(l)) facts.push({ label: "קומה", value: l.floor === 0 ? "קרקע" : l.total_floors ? `${l.floor} מתוך ${l.total_floors}` : String(l.floor) });
  else if (l.has_balcony) facts.push({ label: "מרפסת", value: sized(l.balcony_sqm, l.balcony_count) });
  else if (l.parking_spots > 0) facts.push({ label: "חניות", value: String(l.parking_spots) });
  else if (l.has_safe_room) facts.push({ label: "ממ״ד", value: "יש" });
  return facts;
}

/** "2 · 30 מ״ר סה״כ" / "1 · 13 מ״ר" / "16 מ״ר" / "יש": how many and how big, from whatever the CRM has. */
function amount(count: number | null | undefined, sqm: number | null | undefined): string {
  const size = sqm ? `${formatRooms(sqm)} מ״ר${(count ?? 0) > 1 ? " סה״כ" : ""}` : null;
  const parts = [count && count > 0 ? String(count) : null, size].filter(Boolean);
  return parts.length ? parts.join(" · ") : "יש";
}

/**
 * Everything the CRM knows about the listing that a buyer may see, as rows of a details table.
 * A row appears only when there is something to say: a feature the CRM doesn't have ticked is
 * left out, not shown as "no" (an empty box in the CRM may only mean nobody filled it in).
 */
export function listingDetails(l: Listing): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined | false) => {
    if (value) rows.push({ label, value });
  };
  add("סוג נכס", l.property_type);
  add("חדרים", formatRooms(l.rooms));
  add("שטח", l.size_sqm != null && `${formatRooms(l.size_sqm)} מ״ר`);
  if (hasFloor(l)) {
    const floor = l.floor === 0 ? "קרקע" : String(l.floor);
    add("קומה", l.total_floors ? `${floor} מתוך ${l.total_floors}` : floor);
  }
  add("כניסה", entryText(l));
  add("חניות", l.parking_spots > 0 && String(l.parking_spots));
  add("מרפסות", l.has_balcony && amount(l.balcony_count, l.balcony_sqm));
  add("גינה", l.has_garden && amount(l.garden_count, l.garden_sqm));
  add("יחידת דיור", l.has_rental_unit && amount(l.rental_unit_count, l.rental_unit_sqm));
  add("ממ״ד", l.has_safe_room && "יש");
  add("מעלית", l.has_elevator && "יש");
  add("מחסן", l.has_storage && "יש");
  add("מצב הנכס", l.is_renovated && "משופץ");
  return rows;
}

/** "כניסה מיידית" / "כניסה: 1.3.2027" / null */
export function entryText(l: Listing): string | null {
  if (l.eviction_immediate) return "מיידית";
  if (!l.eviction_date) return null;
  const d = new Date(`${l.eviction_date}T00:00:00`);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" });
}

/**
 * How a link to the listing looks when it is shared (the tab title, and the WhatsApp / Facebook
 * preview): its name, place and price, its main facts, and its first photo through the image
 * optimizer, kept near 200KB (WhatsApp skips preview images much over 300KB).
 */
export function listingPreview(l: Listing): { title: string; description: string; image: { url: string; width: number; height?: number; alt: string } } {
  const title = `${listingName(l)}, ${listingPlace(l)} · ${formatPrice(l.current_price)}`;
  const facts = [l.rooms != null && `${formatRooms(l.rooms)} חדרים`, l.size_sqm != null && `${formatRooms(l.size_sqm)} מ״ר`, ...listingFeatures(l).slice(0, 3)]
    .filter(Boolean)
    .join(" · ");
  const description = [facts, l.description?.replace(/\s+/g, " ").slice(0, 160)].filter(Boolean).join(". ");
  const image = l.image_paths[0]
    ? { url: `/_next/image?url=${encodeURIComponent(photoUrl(l.image_paths[0]))}&w=828&q=75`, width: 828, alt: title }
    : { url: "/og-default.png", width: 1200, height: 630, alt: "RE/MAX טאבו נכסים" };
  return { title, description, image };
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
