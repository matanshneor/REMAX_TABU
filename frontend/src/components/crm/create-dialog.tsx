"use client";

import { useEffect, useState } from "react";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveRecord } from "@/lib/data";
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
  onCancel,
  onDirtyChange,
  onCreated,
}: {
  table: TableName;
  sections: FormSection[];
  initial?: Record<string, unknown>;
  extra?: Record<string, unknown>;
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
    save.mutate({ values: { ...toPayload(sections, form.values), ...extra } }, { onSuccess: onCreated });
  }

  return (
    <form onSubmit={submit} className="contents">
      <div className="-mx-4 overflow-y-auto px-4 py-1">
        <EntityForm sections={sections} values={form.values} onChange={form.set} idPrefix="new" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "שומר…" : "שמירה"}
        </Button>
      </DialogFooter>
    </form>
  );
}
