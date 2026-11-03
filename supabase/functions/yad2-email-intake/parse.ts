// Reads the listings out of a Yad2 alert email ("התראות יד2 - ריכוז מודעות יומי"). No dependencies,
// so it runs the same in the edge function and in a local test.
//
// The email is read as a stream of pieces: each text node, plus a marker for every listing link
// (`realestate/item/<code>`) and photo (`img.yad2.co.il`). A card is everything from its first link
// to the next card's; inside it: "‏3,450,000 ‏₪" · street · "neighborhood, sub-area" · type ·
// "3 חדרים" · "90 מ״ר" · "לפרטים נוספים".

export type AlertListing = {
  code: string;
  url: string;
  imageUrl: string | null;
  price: number | null;
  street: string;
  neighborhood: string | null;
  area: string | null;
  type: string | null;
  rooms: number | null;
  sizeSqm: number | null;
};

const ENTITIES: Record<string, string> = { nbsp: " ", zwnj: "", amp: "&", quot: '"', lt: "<", gt: ">", "#39": "'" };
const clean = (s: string) =>
  s
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1))) : m))
    .replace(/[\u200b-\u200f\u202a-\u202e\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Not part of a listing: labels the email puts around the details. */
const NOISE = new Set(["ירד ב-", "גם בטרייד אין", "לפרטים נוספים", "חדש", "חדש!"]);
const NUM = (s: string) => Number(s.replace(/[^\d.]/g, ""));

export function parseYad2Alert(html: string): AlertListing[] {
  const body = html.replace(/<(head|style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  type Piece = { code?: string; img?: string; text?: string };
  const pieces: Piece[] = [];
  const tag = /<a\b[^>]*href="([^"]*)"[^>]*>|<img\b[^>]*src="([^"]*)"[^>]*>|<[^>]+>|([^<]+)/gi;
  for (let m = tag.exec(body); m; m = tag.exec(body)) {
    if (m[1] != null) {
      const code = decodeURIComponent(m[1]).match(/realestate\/item\/(?:[\w-]+\/)*?([a-z0-9]{6,12})(?:[?/]|$)/i)?.[1];
      if (code) pieces.push({ code });
    } else if (m[2] != null) {
      if (/img\.yad2\.co\.il/.test(m[2])) pieces.push({ img: m[2].replace(/&amp;/g, "&") });
    } else if (m[3] != null) {
      // One line can hold several details: "בית הכרם, רמת בית הכרם | דירה | 3 חדרים | 90 מ״ר".
      for (const part of clean(m[3]).split("|")) {
        const text = part.trim();
        if (text) pieces.push({ text });
      }
    }
  }

  const cards = new Map<string, { img: string | null; texts: string[] }>();
  let current: { img: string | null; texts: string[] } | null = null;
  for (const p of pieces) {
    if (p.code) {
      current = cards.get(p.code) ?? null;
      if (!current) {
        current = { img: null, texts: [] };
        cards.set(p.code, current);
      }
    } else if (current && p.img && !current.img) current.img = p.img;
    else if (current && p.text) {
      // The footer ("לכל המודעות" and on) isn't part of the last card.
      if (p.text === "לכל המודעות") current = null;
      else current.texts.push(p.text);
    }
  }

  const out: AlertListing[] = [];
  for (const [code, { img, texts }] of cards) {
    const t = texts.filter((x) => !NOISE.has(x));
    const priceAt = t.findIndex((x) => x.includes("₪"));
    const rest = t.slice(priceAt + 1);
    const rooms = rest.find((x) => /^[\d.]+\s*חדרים?$/.test(x));
    const size = rest.find((x) => /^[\d,]+\s*מ["״]ר$/.test(x));
    const [street, place, type] = rest.filter((x) => x !== rooms && x !== size);
    if (!street) continue;
    const [neighborhood, area] = (place ?? "").split(",").map((x) => x.trim());
    out.push({
      code,
      url: `https://www.yad2.co.il/realestate/item/${code}`,
      imageUrl: img,
      price: priceAt >= 0 ? NUM(t[priceAt]) || null : null,
      street,
      neighborhood: neighborhood || null,
      area: area || null,
      type: type ?? null,
      rooms: rooms ? NUM(rooms) : null,
      sizeSqm: size ? NUM(size) : null,
    });
  }
  return out;
}
