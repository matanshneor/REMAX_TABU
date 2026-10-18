"use client";

import { BellPlusIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveRecord } from "@/lib/data";
import { QuickDate } from "./quick-date";

/** "Remind me" from a buyer's or seller's card: creates a private task linked to it. */
export function ReminderButton({
  buyerId,
  propertyId,
  defaultTitle,
}: {
  buyerId?: string;
  propertyId?: string;
  defaultTitle: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BellPlusIcon />
        תזכורת
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <ReminderForm buyerId={buyerId} propertyId={propertyId} defaultTitle={defaultTitle} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReminderForm({
  buyerId,
  propertyId,
  defaultTitle,
  onDone,
}: {
  buyerId?: string;
  propertyId?: string;
  defaultTitle: string;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [title, setTitle] = useState(defaultTitle);
  const [due, setDue] = useState<string | null>(null);
  const save = useSaveRecord("tasks", { silent: true });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    save.mutate(
      {
        values: {
          title: title.trim(),
          due_at: due,
          buyer_id: buyerId ?? null,
          property_id: propertyId ?? null,
          assigned_to: profile?.id,
          created_by: profile?.id,
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">תזכורת חדשה</DialogTitle>
        <DialogDescription>תופיע ב״המשימות שלי״. רק אתה רואה אותה.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reminder-title" className="text-xs text-muted-foreground">
            מה לעשות?
          </Label>
          <Input id="reminder-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">מתי?</span>
          <QuickDate value={due} onChange={setDue} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button type="submit" disabled={!title.trim() || save.isPending}>
          שמור תזכורת
        </Button>
      </DialogFooter>
    </form>
  );
}
