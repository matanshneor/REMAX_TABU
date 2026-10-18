import type { FormSection } from "@/components/form/types";
import { PISGAT_AREAS, PROPERTY_STATUS, PROPERTY_TYPES, toOptions } from "@/lib/labels";

/** Only the recruiting agent / admin may change these (enforced by a DB trigger). */
export const MANAGER_ONLY_FIELDS = ["recruiting_agent_id", "is_exclusive", "exclusivity_start", "exclusivity_end"];

export const PROPERTY_SECTIONS: FormSection[] = [
  {
    title: "מיקום",
    fields: [
      { name: "city", label: "עיר", type: "text", required: true, span: 2 },
      // Suggest the Pisgat Ze'ev areas buyers pick from, so matching compares the same names.
      { name: "neighborhood", label: "שכונה", type: "text", span: 2, suggestions: PISGAT_AREAS.map((a) => ({ value: a.value, label: a.value })) },
      { name: "property_type", label: "סוג נכס", type: "select", options: PROPERTY_TYPES, span: 2 },
      { name: "street", label: "רחוב", type: "text", span: 4 },
      { name: "house_number", label: "מס׳ בית", type: "text", span: 1 },
      { name: "apartment_number", label: "דירה", type: "text", span: 1 },
    ],
  },
  {
    title: "פרטי הנכס",
    fields: [
      { name: "rooms", label: "חדרים", type: "number", step: 0.5, span: 2 },
      { name: "size_sqm", label: "גודל (מ״ר)", type: "number", span: 2 },
      { name: "floor", label: "קומה", type: "number", span: 1 },
      { name: "total_floors", label: "מתוך", type: "number", span: 1 },
    ],
  },
  {
    title: "מחיר ומועדים",
    fields: [
      { name: "current_price", label: "מחיר נוכחי", type: "currency", span: 2 },
      { name: "previous_price", label: "מחיר קודם", type: "currency", span: 2 },
      { name: "eviction_date", label: "תאריך פינוי", type: "date", span: 2 },
    ],
  },
  {
    title: "מאפיינים",
    fields: [
      { name: "has_safe_room", label: "ממ״ד", type: "boolean", span: 2 },
      { name: "has_balcony", label: "מרפסת", type: "boolean", span: 2 },
      { name: "has_elevator", label: "מעלית", type: "boolean", span: 2 },
      { name: "has_storage", label: "מחסן", type: "boolean", span: 2 },
      { name: "is_renovated", label: "משופץ", type: "boolean", span: 2 },
      { name: "parking_spots", label: "חניות", type: "number", span: 2 },
    ],
  },
  {
    title: "סטטוס ובלעדיות",
    fields: [
      { name: "status", label: "סטטוס", type: "select", options: toOptions(PROPERTY_STATUS), required: true, span: 2 },
      { name: "recruiting_agent_id", label: "סוכן מגייס", type: "agent", span: 2 },
      { name: "is_exclusive", label: "בלעדיות", type: "boolean", span: 2 },
      { name: "exclusivity_start", label: "תחילת בלעדיות", type: "date" },
      { name: "exclusivity_end", label: "סיום בלעדיות", type: "date" },
    ],
  },
  {
    title: "מדיה",
    fields: [{ name: "virtual_tour_url", label: "קישור לסיור וירטואלי", type: "url", span: 6, placeholder: "https://" }],
  },
];

/** Seller fields in the "new seller" form; saved to property_owner_details after the insert. */
export const SELLER_CREATE_FIELDS = ["owner_name", "owner_phone", "owner_notes"];

/** Create form: seller first, then the property (no previous price — it's filled automatically). */
export const PROPERTY_CREATE_SECTIONS: FormSection[] = [
  {
    title: "פרטי המוכר",
    fields: [
      { name: "owner_name", label: "שם המוכר", type: "text" },
      { name: "owner_phone", label: "טלפון", type: "tel" },
      { name: "owner_notes", label: "הערות על המוכר", type: "textarea", span: 6 },
    ],
  },
  ...PROPERTY_SECTIONS.map((s) => ({
    ...s,
    fields: s.fields.filter((f) => f.name !== "previous_price"),
  })),
];

export const OWNER_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "owner_name", label: "שם המוכר", type: "text" },
      { name: "owner_phone", label: "טלפון", type: "tel" },
      { name: "notes", label: "הערות", type: "textarea", span: 6 },
    ],
  },
];
