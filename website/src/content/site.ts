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

/** "המשרד שלנו": the office in its own words (from the office's printed "מי אנחנו?", 11.11.2026, typos fixed). */
export const OFFICE_ABOUT = {
  title: "מי אנחנו?",
  paragraphs: [
    "חברת רימקס טאבו נכסים הינה החברה המובילה באזור פסגת זאב וצפון ירושלים, המתמחה בשיווק, ניהול ותיווך נדל״ן. לחברה גישה מרכזית המתמקדת בהבנת צרכיו הייחודיים של הלקוח, בשילוב ידע מקצועי מקיף.",
    "החברה משקיעה משאבים רבים בפרסום, הן בעיתונות הכתובה המקומית והן בפרסום טכנולוגי בתחום הנדל״ן. רימקס טאבו נכסים חרטה על דגלה את ערכי האמינות, היושר, השקיפות וההגינות, לצד מקצוענות ללא פשרות, ועל כך יעידו מספר רב של לקוחותינו.",
    "חשוב לציין כי אנו נמצאים בקשרי עבודה הדוקים עם יועצי משכנתאות ומיטב עורכי הדין, למתן ייעוץ משפטי להשלמת העסקה על הצד הטוב ביותר ובזמן הקצר ביותר.",
  ],
};

/** The manager's own part of the page (text from the office's printed brochure, 11.11.2026). */
export const ABOUT = {
  title: "משה שניאור",
  lead: "מלווה אתכם במכירה ובקנייה של בתים בירושלים, מהביקור הראשון ועד החתימה.",
  paragraphs: [
    "מנכ״ל ובעלים. בעל ניסיון רב בתיווך מקרקעין, בעל תואר שני, מוסמך למשפטים, מגשר, מוסמך כבורר ע״י אוניברסיטת בר־אילן. בעל רישיון תיווך. שימש בעבר כסגן מנהל סניף בבנק מזרחי טפחות.",
  ] as Text[],
  facts: [
    { label: "רישיון תיווך", value: LICENSE as Text },
    { label: "עסקאות", value: "עשרות" as Text },
  ],
};

export const ACCESSIBILITY_UPDATED = "11.11.2026";
export const PRIVACY_UPDATED = "11.11.2026";
