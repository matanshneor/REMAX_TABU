import type { FieldDef, FormSection, FormValues } from "./types";

const NUMERIC = new Set(["number", "currency"]);

export function allFields(sections: FormSection[]): FieldDef[] {
  return sections.flatMap((s) => s.fields);
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** DB row → editable form values. */
export function toFormValues(sections: FormSection[], row: Record<string, unknown> = {}): FormValues {
  const values: FormValues = {};
  for (const f of allFields(sections)) {
    const v = row[f.name];
    if (f.type === "boolean") values[f.name] = Boolean(v);
    else if (f.type === "tags" || f.type === "multi") values[f.name] = Array.isArray(v) ? v : [];
    else if (f.type === "datetime") values[f.name] = typeof v === "string" ? toLocalDateTimeInput(v) : "";
    else if (f.type === "date" && typeof v === "string") values[f.name] = v.slice(0, 10);
    else values[f.name] = v == null ? "" : String(v);
  }
  return values;
}

/** Editable form values → DB payload (empty → null, numbers parsed). */
export function toPayload(sections: FormSection[], values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const f of allFields(sections)) {
    const v = values[f.name];
    if (f.type === "boolean" || f.type === "tags" || f.type === "multi") payload[f.name] = v;
    else if (v === "" || v == null) payload[f.name] = null;
    else if (NUMERIC.has(f.type)) payload[f.name] = Number(v);
    else if (f.type === "datetime") payload[f.name] = new Date(String(v)).toISOString();
    else payload[f.name] = typeof v === "string" ? v.trim() : v;
  }
  return payload;
}

/** Only the fields whose value changed (keeps updates minimal, avoids touching locked columns). */
export function changedPayload(
  sections: FormSection[],
  initial: FormValues,
  values: FormValues,
): Record<string, unknown> {
  const before = toPayload(sections, initial);
  const after = toPayload(sections, values);
  return Object.fromEntries(
    Object.entries(after).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])),
  );
}

export function missingRequired(sections: FormSection[], values: FormValues): FieldDef | undefined {
  return allFields(sections).find((f) => f.required && (values[f.name] === "" || values[f.name] == null));
}
