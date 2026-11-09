import type { FormSection } from "@/components/form/types";
import { BUYER_STATUS, LEAD_SOURCES, OTHER_SOURCE, PISGAT_AREAS, PROPERTY_TYPES, REQUIREMENT, SOURCE_DETAIL, toOptions } from "@/lib/labels";

const REQUIREMENT_OPTIONS = toOptions(REQUIREMENT);

const CONTACT: FormSection = {
  title: "פרטי קשר",
  fields: [
    { name: "full_name", label: "שם מלא", type: "text", required: true },
    { name: "phone", label: "טלפון", type: "tel", placeholder: "050-0000000" },
    { name: "email", label: "אימייל", type: "email" },
    { name: "lead_source", label: "מקור ליד", type: "select", options: LEAD_SOURCES, other: OTHER_SOURCE, detail: SOURCE_DETAIL, placeholder: "לדוגמה: חבר של משה" },
    { name: "status", label: "סטטוס", type: "select", options: toOptions(BUYER_STATUS), required: true },
  ],
};

const WANTS: FormSection = {
  title: "מה הקונה מחפש",
  fields: [
    { name: "preferred_neighborhoods", label: "אזור בפסגה", type: "multi", options: PISGAT_AREAS, span: 6 },
    { name: "min_rooms", label: "חדרים (מינימום)", type: "number", step: 0.5, span: 2 },
    { name: "max_budget", label: "תקציב מקסימלי", type: "currency", span: 2 },
    { name: "property_type", label: "סוג נכס", type: "select", options: PROPERTY_TYPES, span: 2 },
    { name: "floor_min", label: "מקומה", type: "number", span: 1, min: -1 },
    { name: "floor_max", label: "עד קומה", type: "number", span: 1, min: -1 },
    { name: "needs_balcony", label: "מרפסת", type: "select", options: REQUIREMENT_OPTIONS, noEmpty: true, span: 2 },
    { name: "needs_elevator", label: "מעלית", type: "select", options: REQUIREMENT_OPTIONS, noEmpty: true, span: 2 },
    { name: "needs_safe_room", label: "ממ״ד", type: "select", options: REQUIREMENT_OPTIONS, noEmpty: true, span: 2 },
  ],
};

const FINANCE: FormSection = {
  title: "מימון",
  fields: [
    { name: "equity", label: "הון עצמי", type: "currency", span: 2 },
    { name: "mortgage_approved", label: "משכנתא מאושרת", type: "boolean", span: 2 },
    { name: "sold_apartment", label: "מכר דירה", type: "boolean", span: 2 },
  ],
};

const NOTES: FormSection = { fields: [{ name: "notes", label: "הערות", type: "textarea", span: 6 }] };

/** All buyer fields, in the order used when adding a buyer. */
export const BUYER_SECTIONS: FormSection[] = [CONTACT, WANTS, FINANCE, NOTES];

/** In an existing buyer's card, what the buyer wants comes first; contact details after the call log. */
export const BUYER_CARD_TOP: FormSection[] = [WANTS, FINANCE];
export const BUYER_CARD_BOTTOM: FormSection[] = [CONTACT, NOTES];

/** Defaults for a new buyer. */
export const NEW_BUYER = {
  status: "new",
  needs_balcony: "any",
  needs_elevator: "any",
  needs_safe_room: "any",
};

/** New buyer, admin: can hand the buyer to anyone on the team; agents keep what they enter. */
export const ADMIN_CREATE_SECTIONS: FormSection[] = [
  { fields: [{ name: "recruiter_id", label: "סוכן מגייס (מטפל)", type: "team", span: 6 }] },
  ...BUYER_SECTIONS,
];
