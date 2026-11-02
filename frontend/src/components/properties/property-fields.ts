import type { FormSection } from "@/components/form/types";
import { LEAD_SOURCES, OTHER_SOURCE, PISGAT_AREAS, PROPERTY_STATUS, PROPERTY_TYPES, toOptions } from "@/lib/labels";

/** No field is required: a seller can always be saved, even half filled in. */

/** Only the recruiting agent / admin may change these (enforced by a DB trigger). */
export const MANAGER_ONLY_FIELDS = ["recruiter_id", "is_exclusive", "exclusivity_start", "exclusivity_end"];

/** Shown right under the photos in the property panel; at the end of the "new seller" form. */
export const PROPERTY_DESCRIPTION_SECTION: FormSection = {
  title: "תיאור הנכס",
  fields: [
    {
      name: "description",
      label: "תיאור חופשי",
      type: "textarea",
      span: 6,
      placeholder: "לדוגמה: דירה מוארת עם נוף פתוח, מטבח משודרג, קרובה לבתי ספר ולתחבורה ציבורית",
    },
  ],
};

export const PROPERTY_SECTIONS: FormSection[] = [
  {
    title: "מיקום",
    fields: [
      { name: "city", label: "עיר", type: "text", span: 2 },
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
      { name: "floor", label: "קומה", type: "number", span: 1, min: -1 },
      { name: "total_floors", label: "מתוך", type: "number", span: 1 },
    ],
  },
  {
    title: "מחיר ומועדים",
    fields: [
      { name: "current_price", label: "מחיר נוכחי", type: "currency", span: 2 },
      { name: "previous_price", label: "מחיר קודם", type: "currency", span: 2 },
      { name: "eviction_date", label: "תאריך פינוי", type: "date", span: 2, now: { field: "eviction_immediate", label: "מיידי" } },
      { name: "eviction_immediate", label: "פינוי מיידי", type: "boolean", hidden: true },
    ],
  },
  {
    title: "מאפיינים",
    fields: [
      { name: "has_safe_room", label: "ממ״ד", type: "boolean", span: 2 },
      { name: "has_elevator", label: "מעלית", type: "boolean", span: 2 },
      { name: "has_storage", label: "מחסן", type: "boolean", span: 2 },
      { name: "is_renovated", label: "משופץ", type: "boolean", span: 2 },
      { name: "parking_spots", label: "חניות", type: "number", span: 2 },
    ],
  },
  {
    // Filling in a count or a size ticks "גינה" / "מרפסת" / "יחידת דיור" on save (a DB trigger), so search and matching see it.
    title: "גינה, מרפסות ויחידות דיור",
    fields: [
      { name: "has_garden", label: "גינה", type: "boolean", span: 2 },
      { name: "garden_count", label: "מספר גינות", type: "number", span: 2 },
      { name: "garden_sqm", label: "גודל הגינות (מ״ר)", type: "number", span: 2 },
      { name: "has_balcony", label: "מרפסת", type: "boolean", span: 2 },
      { name: "balcony_count", label: "מספר מרפסות", type: "number", span: 2 },
      { name: "balcony_sqm", label: "גודל המרפסות (מ״ר)", type: "number", span: 2 },
      { name: "has_rental_unit", label: "יחידות דיור", type: "boolean", span: 2 },
      { name: "rental_unit_count", label: "מספר יחידות", type: "number", span: 2 },
      { name: "rental_unit_sqm", label: "גודל סה״כ (מ״ר)", type: "number", span: 2 },
    ],
  },
  PROPERTY_DESCRIPTION_SECTION,
  {
    title: "סטטוס ובלעדיות",
    fields: [
      { name: "status", label: "סטטוס", type: "select", options: toOptions(PROPERTY_STATUS), noEmpty: true, span: 2 },
      { name: "recruiter_id", label: "סוכן מגייס", type: "team", span: 2 },
      { name: "lead_source", label: "מקור", type: "select", options: LEAD_SOURCES, other: OTHER_SOURCE, placeholder: "לדוגמה: חבר של משה", span: 2 },
      { name: "is_exclusive", label: "בלעדיות", type: "boolean", span: 2 },
      { name: "exclusivity_start", label: "תחילת בלעדיות", type: "date", span: 2 },
      { name: "exclusivity_end", label: "סיום בלעדיות", type: "date", span: 2 },
    ],
  },
  {
    title: "מדיה",
    fields: [{ name: "virtual_tour_url", label: "קישור לסיור וירטואלי", type: "url", span: 6, placeholder: "https://" }],
  },
];

/** Seller fields in the "new seller" form; saved to property_owner_details after the insert. */
export const SELLER_CREATE_FIELDS = ["owner_name", "owner_phone", "owner_notes"];

export const SELLER_CREATE_SECTION: FormSection = {
  title: "פרטי המוכר",
  fields: [
    { name: "owner_name", label: "שם המוכר", type: "text" },
    { name: "owner_phone", label: "טלפון", type: "tel" },
    { name: "owner_notes", label: "הערות על המוכר", type: "textarea", span: 6 },
  ],
};

/** A new seller: the property's sections without the previous price (it's filled automatically). */
const CREATE_PROPERTY_SECTIONS = PROPERTY_SECTIONS.map((s) =>
  s === PROPERTY_DESCRIPTION_SECTION ? s : { ...s, fields: s.fields.filter((f) => f.name !== "previous_price") },
);
/** Agents recruit for themselves; only the admin picks another recruiter from the team list. */
const AGENT_CREATE_PROPERTY_SECTIONS = CREATE_PROPERTY_SECTIONS.map((s) =>
  s === PROPERTY_DESCRIPTION_SECTION ? s : { ...s, fields: s.fields.filter((f) => f.name !== "recruiter_id") },
);
export const propertyCreateSections = (admin: boolean) => (admin ? CREATE_PROPERTY_SECTIONS : AGENT_CREATE_PROPERTY_SECTIONS);

export const NEW_PROPERTY = { status: "active", parking_spots: 0 };

export const OWNER_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "owner_name", label: "שם המוכר", type: "text" },
      { name: "owner_phone", label: "טלפון", type: "tel" },
      { name: "notes", label: "הערות", type: "textarea", span: 6 },
    ],
  },
];
