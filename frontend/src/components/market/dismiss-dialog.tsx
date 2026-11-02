"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DISMISS_REASONS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const OTHER = "אחר";

/** "לא רלוונטי": a reason is required (a quick choice, or typed in under "אחר"). */
export function DismissDialog({
  open,
  onOpenChange,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <DismissForm onCancel={() => onOpenChange(false)} onConfirm={onConfirm} busy={busy} />}</DialogContent>
    </Dialog>
  );
}

function DismissForm({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: (reason: string) => void; busy?: boolean }) {
  const [picked, setPicked] = useState("");
  const [other, setOther] = useState("");
  const reason = picked === OTHER ? other.trim() : picked;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (reason) onConfirm(reason);
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">למה לא רלוונטי?</DialogTitle>
        <DialogDescription>יירשם שאתה סימנת, ומתי. אפשר להחזיר את המודעה לחדשות בכל זמן.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="סיבה">
        {[...DISMISS_REASONS, OTHER].map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={picked === r}
            onClick={() => setPicked(r)}
            className={cn(
              "h-8 rounded-full border px-3 text-sm transition-colors",
              picked === r ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {picked === OTHER && <Input autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="כתבו את הסיבה" aria-label="סיבה אחרת" />}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={!reason || busy}>
          סמן לא רלוונטי
        </Button>
      </DialogFooter>
    </form>
  );
}
