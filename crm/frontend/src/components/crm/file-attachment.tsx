"use client";

import { FileTextIcon, PaperclipIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, openSignedFile, uploadFile, useSaveRecord } from "@/lib/data";
import type { TableName } from "@/lib/types";
import { PanelSection } from "./panel";

/** Single private file (receipt / CV) stored in a bucket, its path saved on the row. */
export function FileAttachment({
  title,
  table,
  rowId,
  column,
  path,
  bucket,
  accept,
}: {
  title: string;
  table: TableName;
  rowId: string;
  column: string;
  path: string | null;
  bucket: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const save = useSaveRecord(table, { silent: true });

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const newPath = await uploadFile(bucket, rowId, file);
      await save.mutateAsync({ id: rowId, values: { [column]: newPath } });
      toast.success("הקובץ הועלה");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <PanelSection title={title}>
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {path ? <FileTextIcon className="size-4" /> : <PaperclipIcon className="size-4" />}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {path ? (
            <button className="font-medium text-primary hover:underline" onClick={() => openSignedFile(bucket, path)}>
              פתח קובץ מצורף
            </button>
          ) : (
            <span className="text-muted-foreground">לא צורף קובץ</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          <UploadIcon />
          {busy ? "מעלה…" : path ? "החלף" : "העלה"}
        </Button>
        <input ref={inputRef} type="file" hidden accept={accept} onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
    </PanelSection>
  );
}
