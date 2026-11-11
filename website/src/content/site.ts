/**
 * Texts for Matan to complete. Everything wrapped in TODO(...) shows on the site as a marked
 * placeholder (dashed frame) until it is replaced with real text.
 */

export const TODO = (what: string) => ({ todo: what }) as const;
export type Text = string | { todo: string };

export const OFFICE = {
  name: "RE/MAX טאבו נכסים",
  tagline: "עם הצלחה לא מתווכחים",
  address: "משה דיין 154, פסגת זאב, ירושלים" as Text,
  hours: "ראשון עד חמישי, 9:00 עד 21:00" as Text,
};

/** The agent's license number (printed on the office's ads too). */
export const LICENSE = "3181402";

export const ABOUT = {
  title: "משה שניאור",
  lead: "מלווה אתכם במכירה ובקנייה של בתים בירושלים, מהביקור הראשון ועד החתימה.",
  // The owner's own words (11.11.2026), with typos fixed.
  paragraphs: [
    "משרד המתמחה בשיווק, ניהול ותיווך נדל״ן. ל-RE/MAX טאבו נכסים גישה מרכזית המתמקדת בהבנת צרכיו הייחודיים של הלקוח, בשילוב ידע מקצועי מקיף.",
    "אנו נמצאים בקשרי עבודה הדוקים עם מיטב עורכי הדין המתמחים בנדל״ן, במטרה לספק ייעוץ משפטי להשלמת עסקת קנייה או מכירה של דירה על הצד הטוב ביותר ובזמן הקצר ביותר.",
  ] as Text[],
  facts: [
    { label: "רישיון תיווך", value: LICENSE as Text },
    { label: "עסקאות", value: "עשרות" as Text },
  ],
};

export const ACCESSIBILITY_UPDATED = "11.11.2026";
export const PRIVACY_UPDATED = "11.11.2026";
