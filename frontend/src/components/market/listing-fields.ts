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
      {
        name: "phone",
        label: "טלפון",
        type: "tel",
        span: 2,
        hint: "ייתכן שזה מספר וירטואלי של יד2, שעובד רק כל עוד המודעה פעילה. בשיחה כדאי לבקש את המספר האמיתי ולעדכן כאן.",
      },
    ],
  },
];

export const NEW_LISTING = { status: "new", source: "יד2" };
