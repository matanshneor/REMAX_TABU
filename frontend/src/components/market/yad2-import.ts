/**
 * Reads the table copied from Yad2 Plus ("נכסים לגיוס") into listings. The paste is read by its
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
    const priceAt = rest.findIndex((p) => p.includes("₪"));
    const before = priceAt >= 0 ? rest.slice(0, priceAt) : [];
    const after = priceAt >= 0 ? rest.slice(priceAt + 1) : rest;
    const phone = after.find((p) => PHONE.test(p.replace(/\s/g, ""))) ?? null;
    const dateAt = after.findIndex((p) => DATE.test(p));
    const d = dateAt >= 0 ? after[dateAt].match(DATE) : null;
    // After the date: m², floors in the building, then the contact's name.
    const tail = dateAt >= 0 ? after.slice(dateAt + 1) : [];
    const nums = tail.filter((p) => NUMBER.test(p));
    const contact = tail.find((p) => !NUMBER.test(p) && !PHONE.test(p.replace(/\s/g, ""))) ?? null;
    const item: ImportedListing = {
      key: addressKey(street),
      deal: DEALS[deal],
      city,
      street,
      type: TYPES[rawType] ?? rawType,
      rooms: toNumber(before[0]),
      floor: toNumber(before[1]),
      price: priceAt >= 0 ? toNumber(rest[priceAt].replace(/[^\d]/g, "")) : null,
      phone: phone && phone.replace(/\s/g, ""),
      listedAt: d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : null,
      sizeSqm: toNumber(nums[0]),
      totalFloors: toNumber(nums[1]),
      contact: contact === "הצגת מספר" ? null : contact,
    };
    // Two pages pasted together may repeat a row.
    const id = `${item.key}|${item.price}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}
