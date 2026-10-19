import type { FormSection } from "@/components/form/types";
import { BUYER_STATUS, LEAD_SOURCES, PISGAT_AREAS, PROPERTY_TYPES, REQUIREMENT, toOptions } from "@/lib/labels";

const REQUIREMENT_OPTIONS = toOptions(REQUIREMENT);

export const BUYER_SECTIONS: FormSection[] = [
  {
    title: "פרטי קשר",
    fields: [
      { name: "full_name", label: "שם מלא", type: "text", required: true },
      { name: "phone", label: "טלפון", type: "tel", placeholder: "050-0000000" },
      { name: "email", label: "אימייל", type: "email" },
      { name: "lead_source", label: "מקור ליד", type: "select", options: LEAD_SOURCES },
      { name: "status", label: "סטטוס", type: "select", options: toOptions(BUYER_STATUS), required: true },
    ],
  },
  {
    title: "מה הקונה מחפש",
    fields: [
      { name: "preferred_neighborhoods", label: "אזור בפסגה", type: "multi", options: PISGAT_AREAS, span: 6 },
      { name: "min_rooms", label: "חדרים (מינימום)", type: "number", step: 0.5, span: 2 },
      { name: "max_budget", label: "תקציב מקסימלי", type: "currency", span: 2 },
      { name: "property_type", label: "סוג נכס", type: "select", options: PROPERTY_TYPES, span: 2 },
      { name: "floor_min", label: "מקומה", type: "number", span: 1 },
      { name: "floor_max", label: "עד קומה", type: "number", span: 1 },
      { name: "needs_balcony", label: "מרפסת", type: "select", options: REQUIREMENT_OPTIONS, required: true, span: 2 },
      { name: "needs_elevator", label: "מעלית", type: "select", options: REQUIREMENT_OPTIONS, required: true, span: 2 },
      { name: "needs_safe_room", label: "ממ״ד", type: "select", options: REQUIREMENT_OPTIONS, required: true, span: 2 },
    ],
  },
  {
    title: "מימון",
    fields: [
      { name: "equity", label: "הון עצמי", type: "currency", span: 2 },
      { name: "mortgage_approved", label: "משכנתא מאושרת", type: "boolean", span: 2 },
      { name: "sold_apartment", label: "מכר דירה", type: "boolean", span: 2 },
    ],
  },
  {
    title: "הערות",
    fields: [{ name: "notes", label: "הערות", type: "textarea", span: 6 }],
  },
];

/** Defaults for a new buyer. */
export const NEW_BUYER = {
  status: "new",
  needs_balcony: "any",
  needs_elevator: "any",
  needs_safe_room: "any",
};
