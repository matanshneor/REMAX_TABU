/**
 * Reads the table copied from Yad2 Plus ("גיוס נכסים חדשים") into listings. The paste is read by its
 * content, not by column position: each row starts at "למכירה" / "להשכרה", and the price (₪),
 * phone and date are told apart by their form, so a hidden or reordered column doesn't shift the rest.
 *
 * A row reads: deal · city · street · type · rooms · floor · price · phone · date · m² · floors · contact.
 */

export type ImportedListing = {
  key: string;
  deal: "sale" | "rent";
  city: string;
  street: string;
  type: string;
  rooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  price: number | null;
  phone: string | null;
  listedAt: string | null;
  sizeSqm: number | null;
  contact: string | null;
};

const DEALS: Record<string, ImportedListing["deal"]> = { למכירה: "sale", להשכרה: "rent" };

/** Yad2's type names → the CRM's (anything else is kept as written). */
const TYPES: Record<string, string> = {
  "גג/ פנטהאוז": "פנטהאוז",
  "גג/פנטהאוז": "פנטהאוז",
  "בית פרטי/ קוטג'": "בית פרטי",
  "בית פרטי/קוטג'": "בית פרטי",
  "דו משפחתי": "דו-משפחתי",
};

const clean = (s: string) => s.replace(/[‎‏‪-‮ ]/g, " ").replace(/\s+/g, " ").trim();
const PHONE = /^0\d{1,2}-?\d{7}$/;
const DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const NUMBER = /^\d+(\.\d+)?$/;

/** The pasted text as separate pieces: each table cell, and each line inside a cell. */
export function pastePieces(html: string, text: string): string[] {
  if (html && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pieces: string[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = clean(n.textContent ?? "");
      if (t) pieces.push(t);
    }
    if (pieces.some((p) => p in DEALS)) return pieces;
  }
  return text.split(/[\t\r\n]+/).map(clean).filter(Boolean);
}

/** "שדרות משה דיין 158" and "משה דיין 158" are the same place. */
export function addressKey(street: string | null | undefined): string {
  return clean(street ?? "")
    .replace(/^(רחוב|רח'|שדרות|שד'|דרך)\s+/, "")
    .replace(/["'״׳\-.,]/g, "")
    .replace(/\s+/g, "");
}

const toNumber = (s: string | undefined) => (s && NUMBER.test(s.replace(/,/g, "")) ? Number(s.replace(/,/g, "")) : null);

/** Yad2 shows "-" in an empty cell. */
const value = (s: string | undefined) => (s == null || s === "-" || s === "—" ? undefined : s);

export function parseYad2Plus(pieces: string[]): ImportedListing[] {
  const rows: string[][] = [];
  for (const p of pieces) {
    if (p in DEALS) rows.push([p]);
    else rows.at(-1)?.push(p);
  }
  const seen = new Set<string>();
  const out: ImportedListing[] = [];
  for (const r of rows) {
    const [deal, city = "", street = "", rawType = "", ...rest] = r;
    if (!street) continue;
    let cells: (string | undefined)[];
    if (rest.length >= 8) {
      // Every cell came through (an empty one as "-"): read by position.
      cells = rest.slice(0, 7).map(value);
      cells.push(value(rest.slice(7).join(" ")));
    } else {
      // Some cells are missing: find the price, phone and date by their form.
      const priceAt = rest.findIndex((p) => p.includes("₪"));
      const dateAt = rest.findIndex((p) => DATE.test(p));
      const before = rest.slice(0, priceAt >= 0 ? priceAt : dateAt >= 0 ? dateAt : rest.length);
      const tail = dateAt >= 0 ? rest.slice(dateAt + 1) : [];
      const nums = tail.filter((p) => NUMBER.test(p));
      cells = [
        value(before[0]),
        value(before[1]),
        priceAt >= 0 ? rest[priceAt] : undefined,
        rest.find((p) => PHONE.test(p.replace(/\s/g, ""))),
        dateAt >= 0 ? rest[dateAt] : undefined,
        nums[0],
        nums[1],
        tail.find((p) => !NUMBER.test(p) && value(p) && !PHONE.test(p.replace(/\s/g, ""))),
      ];
    }
    const [rooms, floor, price, phone, date, sqm, floors, contact] = cells;
    const d = date?.match(DATE);
    const tel = phone?.replace(/\s/g, "");
    const item: ImportedListing = {
      key: addressKey(street),
      deal: DEALS[deal],
      city,
      street,
      type: TYPES[rawType] ?? rawType,
      rooms: toNumber(rooms),
      floor: toNumber(floor),
      price: price?.includes("₪") ? toNumber(price.replace(/[^\d]/g, "")) : null,
      phone: tel && PHONE.test(tel) ? tel : null,
      listedAt: d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : null,
      sizeSqm: toNumber(sqm),
      totalFloors: toNumber(floors),
      contact: contact && contact !== "הצגת מספר" ? contact : null,
    };
    // Two pages pasted together may repeat a row; two flats in one building are two rows.
    const id = rowId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/** One row of the paste: the address alone isn't enough (two flats for sale in one building). */
export const rowId = (r: ImportedListing) => `${r.key}|${r.price}|${r.phone}|${r.rooms}`;
