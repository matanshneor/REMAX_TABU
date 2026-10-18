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
  /** Datalist suggestions for free-text fields. */
  suggestions?: Option[];
};

export type FormSection = {
  title?: string;
  fields: FieldDef[];
};

/** Form state: numbers are kept as strings while editing so decimals can be typed. */
export type FormValues = Record<string, unknown>;
