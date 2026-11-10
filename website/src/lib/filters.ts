import { APARTMENT_TYPES, HOUSE_TYPES, type Listing } from "./listings";

/**
 * The listing search, kept in the page address so it can be sent as a link,
 * e.g. /?type=apartments&rooms=4&pmax=2500000
 */
export type Filters = {
  hood: string;
  city: string;
  type: string; // "", "apartments", "houses" or one exact type
  rooms: number | null; // at least
  pmin: number | null;
  pmax: number | null;
  fmin: number | null;
  fmax: number | null;
  smin: number | null;
  smax: number | null;
  features: FeatureKey[];
  sort: SortKey;
  n: number; // how many are shown ("הצגת עוד")
};

export const PAGE_SIZE = 12;

export const FEATURES = {
  mamad: { label: "ממ״ד", test: (l: Listing) => l.has_safe_room },
  elevator: { label: "מעלית", test: (l: Listing) => l.has_elevator },
  parking: { label: "חניה", test: (l: Listing) => l.parking_spots > 0 },
  balcony: { label: "מרפסת", test: (l: Listing) => l.has_balcony },
  garden: { label: "גינה", test: (l: Listing) => l.has_garden },
  storage: { label: "מחסן", test: (l: Listing) => l.has_storage },
  unit: { label: "יחידת דיור", test: (l: Listing) => l.has_rental_unit },
  renovated: { label: "משופץ", test: (l: Listing) => l.is_renovated },
} as const;
export type FeatureKey = keyof typeof FEATURES;

export const SORTS = {
  new: "החדשים ראשונים",
  price_asc: "מחיר: מהנמוך לגבוה",
  price_desc: "מחיר: מהגבוה לנמוך",
} as const;
export type SortKey = keyof typeof SORTS;

export const TYPE_GROUPS = { apartments: "דירות", houses: "בתים" } as const;

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function num(v: string | string[] | undefined): number | null {
  const s = one(v).replace(/[,\s₪]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseFilters(params: Params): Filters {
  const f = params.f;
  const features = (Array.isArray(f) ? f : f ? f.split(",") : []).filter((k): k is FeatureKey => k in FEATURES);
  const sort = one(params.sort);
  const n = num(params.n);
  return {
    hood: one(params.hood),
    city: one(params.city),
    type: one(params.type),
    rooms: num(params.rooms),
    pmin: num(params.pmin),
    pmax: num(params.pmax),
    fmin: num(params.fmin),
    fmax: num(params.fmax),
    smin: num(params.smin),
    smax: num(params.smax),
    features: [...new Set(features)],
    sort: sort in SORTS ? (sort as SortKey) : "new",
    n: n && n > PAGE_SIZE ? Math.min(Math.ceil(n / PAGE_SIZE) * PAGE_SIZE, 500) : PAGE_SIZE,
  };
}

function typeMatches(type: string, l: Listing): boolean {
  if (!type) return true;
  if (type === "apartments") return APARTMENT_TYPES.includes(l.property_type ?? "");
  if (type === "houses") return HOUSE_TYPES.includes(l.property_type ?? "");
  return l.property_type === type;
}

const between = (v: number | null, min: number | null, max: number | null) =>
  (min == null || (v != null && v >= min)) && (max == null || (v != null && v <= max));

export function applyFilters(all: Listing[], f: Filters): Listing[] {
  const out = all.filter(
    (l) =>
      (!f.hood || l.neighborhood === f.hood) &&
      (!f.city || l.city === f.city) &&
      typeMatches(f.type, l) &&
      (f.rooms == null || (l.rooms != null && l.rooms >= f.rooms)) &&
      between(l.current_price, f.pmin, f.pmax) &&
      between(l.floor, f.fmin, f.fmax) &&
      between(l.size_sqm, f.smin, f.smax) &&
      f.features.every((k) => FEATURES[k].test(l)),
  );
  if (f.sort === "new") return out; // the list comes newest first
  const dir = f.sort === "price_asc" ? 1 : -1;
  // Listings without a price go last either way.
  return out.sort((a, b) => {
    if (a.current_price == null) return 1;
    if (b.current_price == null) return -1;
    return (a.current_price - b.current_price) * dir;
  });
}

/** The address of a search; only what's set, so links stay short. */
export function filtersHref(f: Partial<Filters>, path = "/"): string {
  const q = new URLSearchParams();
  const set = (k: string, v: string | number | null | undefined) => {
    if (v != null && v !== "") q.set(k, String(v));
  };
  set("hood", f.hood);
  set("city", f.city);
  set("type", f.type);
  set("rooms", f.rooms);
  set("pmin", f.pmin);
  set("pmax", f.pmax);
  set("fmin", f.fmin);
  set("fmax", f.fmax);
  set("smin", f.smin);
  set("smax", f.smax);
  for (const k of f.features ?? []) q.append("f", k);
  if (f.sort && f.sort !== "new") q.set("sort", f.sort);
  if (f.n && f.n > PAGE_SIZE) q.set("n", String(f.n));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function isFiltered(f: Filters): boolean {
  return Boolean(
    f.hood || f.city || f.type || f.rooms != null || f.pmin != null || f.pmax != null || f.fmin != null ||
      f.fmax != null || f.smin != null || f.smax != null || f.features.length,
  );
}

export function priceText(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toLocaleString("he-IL", { maximumFractionDigits: 2 })} מיליון ₪`;
  }
  return `${n.toLocaleString("he-IL")} ₪`;
}

function typeLabel(type: string): string {
  return type in TYPE_GROUPS ? TYPE_GROUPS[type as keyof typeof TYPE_GROUPS] : type;
}

/** "דירות, 4 חדרים ומעלה, בגילה, עד 2.5 מיליון ₪, עם ממ״ד ומעלית" (prefills the "not found" form). */
export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  if (f.type) parts.push(typeLabel(f.type));
  if (f.rooms != null) parts.push(`${f.rooms} חדרים ומעלה`);
  if (f.hood) parts.push(`ב${f.hood}`);
  else if (f.city) parts.push(`ב${f.city}`);
  if (f.pmin != null && f.pmax != null) parts.push(`${priceText(f.pmin)} עד ${priceText(f.pmax)}`);
  else if (f.pmax != null) parts.push(`עד ${priceText(f.pmax)}`);
  else if (f.pmin != null) parts.push(`מ-${priceText(f.pmin)}`);
  if (f.smin != null || f.smax != null)
    parts.push(f.smin != null && f.smax != null ? `${f.smin}–${f.smax} מ״ר` : f.smin != null ? `מ-${f.smin} מ״ר` : `עד ${f.smax} מ״ר`);
  if (f.fmin != null || f.fmax != null)
    parts.push(f.fmin != null && f.fmax != null ? `קומה ${f.fmin}–${f.fmax}` : f.fmin != null ? `מקומה ${f.fmin}` : `עד קומה ${f.fmax}`);
  if (f.features.length) {
    const labels = f.features.map((k) => FEATURES[k].label);
    const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} ו${labels.at(-1)}` : labels[0];
    parts.push(`עם ${list}`);
  }
  return parts.join(", ");
}
