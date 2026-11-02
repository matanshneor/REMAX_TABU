import type { Enum } from "./types";

export type Option = { value: string; label: string };

export type Tone = "neutral" | "blue" | "red" | "orange" | "green" | "gray" | "purple";

type Labeled<T extends string> = Record<T, { label: string; tone: Tone }>;

export const PROPERTY_STATUS: Labeled<Enum<"property_status">> = {
  active: { label: "פעיל", tone: "green" },
  frozen: { label: "מוקפא", tone: "gray" },
  sold: { label: "נמכר", tone: "purple" },
};

/** Where a listing in "מאגר יד2" stands. */
export const LISTING_STATUS: Labeled<Enum<"listing_status">> = {
  new: { label: "חדש", tone: "blue" },
  contacted: { label: "נוצר קשר", tone: "orange" },
  not_interested: { label: "לא מעוניין", tone: "gray" },
  added: { label: "נוסף למוכרים", tone: "green" },
};

/** Why a listing in "מאגר יד2" isn't relevant (a reason is required; "אחר" is typed in). */
export const DISMISS_REASONS = ["לא מעוניין בשירות", "כבר עובד עם מתווך", "לא ענה", "כבר נמכר", "מודעה של מתווך"];

/** The agreement with the seller. "בתהליך גיוס" isn't offered to buyers yet. */
export const PROPERTY_ENGAGEMENT: Labeled<Enum<"property_engagement">> = {
  exclusive: { label: "בלעדיות", tone: "blue" },
  consent: { label: "הסכמה", tone: "green" },
  recruiting: { label: "בתהליך גיוס", tone: "orange" },
};

/** Offered to buyers (matches, alerts): on the market and with an agreement (exclusivity or consent). */
export const isOffered = (p: { status: Enum<"property_status">; engagement: Enum<"property_engagement"> }) =>
  p.status === "active" && p.engagement !== "recruiting";

export const BUYER_STATUS: Labeled<Enum<"buyer_status">> = {
  new: { label: "חדש", tone: "blue" },
  hot: { label: "חם", tone: "red" },
  warm: { label: "פושר", tone: "orange" },
  bought_with_us: { label: "קנה דרכנו", tone: "green" },
  bought_elsewhere: { label: "קנה במקום אחר", tone: "gray" },
  irrelevant: { label: "לא רלוונטי", tone: "gray" },
};

/** Buyers still being worked on — the ones counted as "active". */
export const ACTIVE_BUYER_STATUSES: Enum<"buyer_status">[] = ["new", "hot", "warm"];
export const isActiveBuyer = (b: { status: Enum<"buyer_status"> }) => ACTIVE_BUYER_STATUSES.includes(b.status);

export const CANDIDATE_STATUS: Labeled<Enum<"candidate_status">> = {
  new: { label: "חדש", tone: "blue" },
  interview_scheduled: { label: "נקבע ראיון", tone: "orange" },
  passed_first: { label: "עבר ראיון ראשון", tone: "purple" },
  hired: { label: "התקבל", tone: "green" },
  rejected: { label: "נדחה", tone: "gray" },
};

export const TRANSACTION_TYPE: Labeled<Enum<"transaction_type">> = {
  income: { label: "הכנסה", tone: "green" },
  expense: { label: "הוצאה", tone: "red" },
};

/** How much a buyer cares about a feature (balcony, elevator, safe room). */
export const REQUIREMENT: Labeled<Enum<"requirement">> = {
  must: { label: "חובה", tone: "blue" },
  nice: { label: "רצוי", tone: "neutral" },
  any: { label: "לא משנה", tone: "gray" },
};

/** Areas in Pisgat Ze'ev, stored in buyers.preferred_neighborhoods. Label is the short form. */
export const PISGAT_AREAS: Option[] = [
  { value: "פסגת זאב מרכז", label: "מרכז" },
  { value: "פסגת זאב מזרח", label: "מזרח" },
  { value: "פסגת זאב מערב", label: "מערב" },
  { value: "פסגת זאב צפון", label: "צפון" },
];

export const USER_ROLE: Labeled<Enum<"user_role">> = {
  agent: { label: "סוכן", tone: "blue" },
  admin: { label: "מנהל", tone: "purple" },
};

export const ACCOUNT_STATUS: Labeled<Enum<"account_status">> = {
  pending: { label: "ממתין לאישור", tone: "orange" },
  active: { label: "פעיל", tone: "green" },
  rejected: { label: "נדחה", tone: "gray" },
};

export function toOptions<T extends string>(map: Labeled<T>): Option[] {
  return Object.entries<{ label: string }>(map).map(([value, { label }]) => ({ value, label }));
}

function list(...labels: string[]): Option[] {
  return labels.map((label) => ({ value: label, label }));
}

export const PROPERTY_TYPES = list(
  "דירה",
  "דירת גן",
  "פנטהאוז",
  "דופלקס",
  "טריפלקס",
  "בית פרטי",
  "קוטג׳",
  "דו-משפחתי",
  "מגרש",
  "מסחרי",
);

/** Where a buyer or seller came from. Anything else is typed in under "אחר" and saved as written. */
export const LEAD_SOURCES = list("יד2", "פייסבוק", "אינסטגרם", "לקוח עבר", "רימקס ישראל", "הפניה", "שלט", "הגיע למשרד");
export const OTHER_SOURCE = "אחר (לכתוב בעצמי)";

/** Sources that also say who: "הפניה" is saved as "הפניה: דוד כהן". */
export const SOURCE_DETAIL: Record<string, string> = { הפניה: "ממי ההפניה? לדוגמה: דוד כהן" };

/** "הפניה: דוד כהן" → "הפניה"; any other value as is. */
export function sourceKind(value: string | null): string | null {
  const head = value?.split(":")[0].trim();
  return head && head in SOURCE_DETAIL ? head : value;
}

/** The list above plus every typed-in source already in use, for filters. */
export function sourceOptions(used: (string | null)[], base: Option[] = LEAD_SOURCES): Option[] {
  const extra = [
    ...new Set(used.map(sourceKind).filter((s): s is string => !!s && !base.some((o) => o.value === s))),
  ].sort();
  return [...base, ...list(...extra)];
}

export const CANDIDATE_SOURCES = list("לינקדאין", "פייסבוק", "הפניה", "אתר דרושים", "אחר");

export const TRANSACTION_CATEGORIES = list(
  "עמלה",
  "שיווק",
  "שכירות",
  "תשלום לסוכן",
  "ציוד משרדי",
  "תוכנה ומנויים",
  "אחר",
);
