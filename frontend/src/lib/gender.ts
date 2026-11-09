/** Gender of an agent: chosen at sign-up, kept on the team list. It decides the title printed on ads. */
export const GENDER_OPTIONS = [
  { value: "male", label: "זכר" },
  { value: "female", label: "נקבה" },
];

/** סוכן / סוכנת נדל"ן. Without a gender, falls back to the title already stored (or a neutral "סוכן"). */
export function agentTitle(gender: string | null | undefined, stored?: string | null): string {
  if (gender === "female") return 'סוכנת נדל"ן';
  if (gender === "male") return 'סוכן נדל"ן';
  return stored || "סוכן";
}
