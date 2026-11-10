/**
 * Texts for Matan to complete. Everything wrapped in TODO(...) shows on the site as a marked
 * placeholder (dashed frame) until it is replaced with real text.
 */

export const TODO = (what: string) => ({ todo: what }) as const;
export type Text = string | { todo: string };

export const OFFICE = {
  name: "RE/MAX טאבו נכסים",
  tagline: "עם הצלחה לא מתווכחים",
  address: TODO("כתובת המשרד (רחוב, מספר, שכונה, עיר)") as Text,
  hours: TODO("שעות פעילות, למשל: א׳–ה׳ 9:00–19:00") as Text,
};

/** The agent's license number (printed on the office's ads too). */
export const LICENSE = "3181402";

export const ABOUT = {
  title: "משה שניאור",
  lead: "זכיין RE/MAX טאבו נכסים. מלווה משפחות וזוגות במכירה ובקנייה של בתים בירושלים, מהביקור הראשון ועד החתימה.",
  paragraphs: [
    TODO("כמה שנים משה בתחום, ואיך הגיע אליו (2–3 משפטים)"),
    TODO("מה מייחד את הדרך שבה משה עובד עם קונים: זמינות, היכרות עם השכונות, ליווי עד החתימה"),
    TODO("משפט אישי: משפחה, קשר לשכונות, למה הוא אוהב את העבודה"),
  ] as Text[],
  areasTitle: "אזורי פעילות",
  /** Shown together with the neighborhoods of the listings on the site. */
  areas: ["פסגת זאב", "הר חומה", "גילה"],
  facts: [
    { label: "רישיון תיווך", value: LICENSE as Text },
    { label: "ניסיון", value: TODO("מספר שנות ניסיון") as Text },
    { label: "עסקאות", value: TODO("מספר עסקאות או משפחות שליווה") as Text },
  ],
};

export const ACCESSIBILITY_UPDATED = "11.11.2026";
