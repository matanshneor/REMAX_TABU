"use client";

import { LockIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

/** Side panel that slides in from the left edge (RTL: opposite the navigation sidebar). */
export function Panel({
  open,
  onClose,
  title,
  subtitle,
  badges,
  headerActions,
  loading,
  missing = false,
  children,
  footer,
  dirty = false,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  headerActions?: React.ReactNode;
  loading?: boolean;
  /** The record wasn't found (deleted, or no longer yours): say so instead of loading forever. */
  missing?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Unsaved edits: closing asks first instead of throwing them away. */
  dirty?: boolean;
}) {
  const guard = useDiscardGuard(dirty, onClose);
  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && guard.requestClose()}>
        <SheetContent side="left" className="gap-0 p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-2xl">
          <SheetHeader className="gap-2 border-b px-4 pt-5 pb-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3 pe-8">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-normal">{missing ? "הרשומה לא נמצאה" : loading ? <Skeleton className="h-6 w-48" /> : title}</SheetTitle>
                {subtitle && <SheetDescription className="mt-0.5">{subtitle}</SheetDescription>}
              </div>
              {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
            </div>
            {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {missing ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                הרשומה לא נמצאה — ייתכן שנמחקה או שהועברה לסוכן אחר.
              </p>
            ) : loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              children
            )}
          </div>
          {footer && !loading && !missing && <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-4 py-3 sm:px-6">{footer}</div>}
        </SheetContent>
      </Sheet>
      {guard.dialog}
    </>
  );
}

/**
 * Wraps a close action: with unsaved changes it first asks "leave without saving?".
 * Render `dialog` next to the panel or form it guards.
 */
export function useDiscardGuard(dirty: boolean, close: () => void) {
  const [asking, setAsking] = useState(false);
  const requestClose = () => (dirty ? setAsking(true) : close());
  const dialog = (
    <Dialog open={asking} onOpenChange={setAsking}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>לצאת בלי לשמור?</DialogTitle>
          <DialogDescription>השינויים שהקלדת עדיין לא נשמרו. אם תצא עכשיו, הם יימחקו.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAsking(false)}>
            המשך לערוך
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setAsking(false);
              close();
            }}
          >
            צא בלי לשמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { requestClose, dialog };
}

export function PanelSection({
  title,
  action,
  children,
  first,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** At the top of the panel: a highlighted box instead of a divider line. */
  first?: boolean;
}) {
  return (
    <section className={first ? "mb-6 rounded-xl border bg-secondary/40 p-4" : "mt-8 border-t pt-5"}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LockBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <LockIcon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function SaveFooter({
  dirty,
  saving,
  onSave,
  onReset,
  onDelete,
  deleteLabel = "מחק",
  deleteDescription,
  disabled,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  /** Replaces the default line in the delete confirmation, e.g. to list what else is deleted. */
  deleteDescription?: string;
  disabled?: boolean;
}) {
  return (
    <>
      <Button onClick={onSave} disabled={!dirty || saving || disabled}>
        {saving ? "שומר…" : "שמירת שינויים"}
      </Button>
      <Button variant="ghost" onClick={onReset} disabled={!dirty || saving}>
        ביטול
      </Button>
      {dirty && <span className="text-xs text-muted-foreground">יש שינויים שלא נשמרו</span>}
      {onDelete && <ConfirmDelete onConfirm={onDelete} label={deleteLabel} description={deleteDescription} />}
    </>
  );
}

export function ConfirmDelete({ onConfirm, label = "מחיקה", description }: { onConfirm: () => void; label?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" size="sm" className="ms-auto" onClick={() => setOpen(true)}>
        <Trash2Icon />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>למחוק לצמיתות?</DialogTitle>
            <DialogDescription>{description ?? "אי אפשר לשחזר את הרשומה אחרי המחיקה."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
