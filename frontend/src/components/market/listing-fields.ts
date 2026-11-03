import type { FormSection } from "@/components/form/types";
import { PROPERTY_TYPES } from "@/lib/labels";

export const LISTING_SECTIONS: FormSection[] = [
  {
    title: "הערות",
    fields: [
      { name: "notes", label: "הערות", type: "textarea", span: 6, placeholder: "לדוגמה: דיברתי עם הבעלים, יחזור אליי ביום ראשון" },
    ],
  },
  {
    title: "המודעה",
    fields: [
      { name: "url", label: "קישור למודעה", type: "url", span: 6, placeholder: "https://www.yad2.co.il/..." },
      { name: "title", label: "כותרת", type: "text", span: 6 },
      { name: "property_type", label: "סוג נכס", type: "select", options: PROPERTY_TYPES, span: 2 },
      { name: "rooms", label: "חדרים", type: "number", step: 0.5, span: 2 },
      { name: "size_sqm", label: "גודל (מ״ר)", type: "number", span: 2 },
      { name: "city", label: "עיר", type: "text", span: 2 },
      { name: "neighborhood", label: "שכונה", type: "text", span: 2 },
      { name: "street", label: "רחוב", type: "text", span: 2 },
      { name: "floor", label: "קומה", type: "number", min: -1, span: 2 },
      { name: "price", label: "מחיר", type: "currency", span: 2 },
      { name: "advertiser", label: "שם המפרסם", type: "text", span: 2 },
      // Shown and edited in the card's contact box, not in the form.
      { name: "phone", label: "טלפון", type: "tel", span: 2, hidden: true },
    ],
  },
];

export const NEW_LISTING = { status: "new", source: "יד2" };

/** Adding a listing by hand: no contact box yet, so the phone is in the form. */
export const NEW_LISTING_SECTIONS: FormSection[] = LISTING_SECTIONS.map((sec) => ({
  ...sec,
  fields: sec.fields.map((f) => (f.name === "phone" ? { ...f, hidden: false } : f)),
}));
