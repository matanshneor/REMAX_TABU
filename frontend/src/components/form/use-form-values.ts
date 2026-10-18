"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormSection, FormValues } from "./types";
import { changedPayload, toFormValues } from "./values";

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

  return { values, set, reset, changes, dirty: Object.keys(changes).length > 0 };
}
