"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FormSection, FormValues } from "./types";
import { changedPayload, formIssue, toFormValues } from "./values";

/** Form state seeded from a DB row; re-seeds when `seedKey` changes (e.g. row id + updated_at). */
export function useFormValues(sections: FormSection[], row: Record<string, unknown> | null | undefined, seedKey: string) {
  const initial = useMemo(() => toFormValues(sections, row ?? {}), [sections, row]);
  const [state, setState] = useState<{ key: string; values: FormValues }>({ key: seedKey, values: initial });

  // Reset during render when the source row changes (React's recommended pattern over effects).
  let values = state.values;
  if (state.key !== seedKey) {
    values = initial;
    setState({ key: seedKey, values: initial });
  }

  const set = useCallback(
    (name: string, value: unknown) => setState((s) => ({ ...s, values: { ...s.values, [name]: value } })),
    [],
  );
  const reset = useCallback(() => setState({ key: seedKey, values: initial }), [seedKey, initial]);
  const changes = useMemo(() => changedPayload(sections, initial, values), [sections, initial, values]);

  /**
   * Shows what's wrong (missing required field, negative number) and returns false, or true when
   * it can be saved. The field in question is marked invalid (red) and gets the cursor.
   */
  const validate = () => {
    const issue = formIssue(sections, values);
    if (!issue) return true;
    toast.error(issue.message);
    const control = document.querySelector<HTMLElement>(`[data-field="${issue.field}"] :is(input, select, textarea, button)`);
    if (control) {
      control.setAttribute("aria-invalid", "true");
      control.focus();
      // The mark goes once the field is edited.
      control.addEventListener("input", () => control.removeAttribute("aria-invalid"), { once: true });
    }
    return false;
  };

  return { values, set, reset, changes, validate, dirty: Object.keys(changes).length > 0 };
}
