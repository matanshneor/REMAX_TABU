import type { Option } from "@/lib/labels";

export type FieldType =
  | "text"
  | "tel"
  | "email"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "textarea"
  | "select"
  | "boolean"
  | "tags"
  | "multi"
  | "agent"
  /** Someone from the office team list (signed up or not). */
  | "team"
  | "buyer"
  | "property";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
  required?: boolean;
  /** Grid columns out of 6 (default 3 = half width). */
  span?: 1 | 2 | 3 | 4 | 6;
  placeholder?: string;
  step?: number;
  /** Lowest value a number field accepts (default 0; floors go down to -1). */
  min?: number;
  /** Datalist suggestions for free-text fields. */
  suggestions?: Option[];
  /** Select only: adds this choice (e.g. "אחר") which opens a text box; the typed text is saved as the value. */
  other?: string;
  /** A short note under the field, e.g. what to keep in mind about its value. */
  hint?: string;
  /**
   * Select with `other` only: choices that also ask "who/what", e.g. { "הפניה": "ממי ההפניה?" }.
   * Picking one opens a text box; the value is saved as "הפניה: דוד כהן" (or just "הפניה").
   */
  detail?: Record<string, string>;
  /** Date only: a button (e.g. "מיידי") that sets this boolean field instead of a date, and clears the date. */
  now?: { field: string; label: string };
  /** Select only: no empty "—" choice, so it always has a value — without being marked required. */
  noEmpty?: boolean;
  /** Kept in the form's values but not drawn (another field controls it, e.g. via `now`). */
  hidden?: boolean;
};

export type FormSection = {
  title?: string;
  fields: FieldDef[];
};

/** Form state: numbers are kept as strings while editing so decimals can be typed. */
export type FormValues = Record<string, unknown>;
