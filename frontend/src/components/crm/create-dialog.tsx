"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection, FormValues } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, useSaveRecord } from "@/lib/data";
import { useDiscardGuard } from "./panel";
import type { TableName } from "@/lib/types";

/** Centered modal for "Add new" forms. */
export function CreateDialog<T extends { id: string }>({
  open,
  onOpenChange,
  title,
  table,
  sections,
  initial,
  extra,
  onCreated,
  renderExtra,
  omitFromInsert,
  afterInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  table: TableName;
  sections: FormSection[];
  initial?: Record<string, unknown>;
  /** Extra columns sent with the insert that aren't in the form. */
  extra?: Record<string, unknown>;
  onCreated?: (row: T) => void;
  /** Live content under the form (e.g. duplicate warnings), computed from the current values. */
  renderExtra?: (values: FormValues) => React.ReactNode;
  /** Form fields that belong to a related table rather than the inserted row. */
  omitFromInsert?: string[];
  /** Saves those related fields once the row exists (e.g. the seller of a new property). */
  afterInsert?: (row: T, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [dirty, setDirty] = useState(false);
  const guard = useDiscardGuard(dirty, () => {
    setDirty(false);
    onOpenChange(false);
  });
  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : guard.requestClose())}>
        <DialogContent className="max-h-[90vh] grid-rows-[auto_1fr_auto] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal">{title}</DialogTitle>
          </DialogHeader>
          {open && (
            <CreateForm
              table={table}
              sections={sections}
              initial={initial}
              extra={extra}
              renderExtra={renderExtra}
              omitFromInsert={omitFromInsert}
              afterInsert={afterInsert as ((row: { id: string }, payload: Record<string, unknown>) => Promise<void>) | undefined}
              onCancel={guard.requestClose}
              onDirtyChange={setDirty}
              onCreated={(row) => {
                setDirty(false);
                onOpenChange(false);
                onCreated?.(row as T);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  );
}

function CreateForm({
  table,
  sections,
  initial,
  extra,
  renderExtra,
  omitFromInsert = [],
  afterInsert,
  onCancel,
  onDirtyChange,
  onCreated,
}: {
  table: TableName;
  sections: FormSection[];
  initial?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  renderExtra?: (values: FormValues) => React.ReactNode;
  omitFromInsert?: string[];
  afterInsert?: (row: { id: string }, payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onCreated: (row: { id: string }) => void;
}) {
  const form = useFormValues(sections, initial, "new");
  useEffect(() => onDirtyChange(form.dirty), [form.dirty, onDirtyChange]);
  const save = useSaveRecord<{ id: string }>(table);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.validate()) return;
    const payload = toPayload(sections, form.values);
    const values = Object.fromEntries(Object.entries(payload).filter(([k]) => !omitFromInsert.includes(k)));
    save.mutate(
      { values: { ...values, ...extra } },
      {
        onSuccess: async (row) => {
          try {
            await afterInsert?.(row, payload);
          } catch (e) {
            toast.error(`נשמר, אבל חלק מהפרטים לא נשמרו: ${errorMessage(e)}`);
          }
          onCreated(row);
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="contents">
      <div className="-mx-4 overflow-y-auto px-4 py-1">
        <EntityForm sections={sections} values={form.values} onChange={form.set} idPrefix="new" />
        {renderExtra && <div className="mt-4 empty:hidden">{renderExtra(form.values)}</div>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "שומר…" : "שמור"}
        </Button>
      </DialogFooter>
    </form>
  );
}
