"use client";

import { ListPlusIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Segmented } from "@/components/crm/segmented";
import { RelationSelect } from "@/components/form/relation-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveRecord } from "@/lib/data";
import { QuickDate } from "./quick-date";

/** "+ משימה ל…" in a buyer's or seller's card: creates a private task linked to them. */
export function ReminderButton({
  buyerId,
  propertyId,
  defaultTitle,
  label,
  heading,
}: {
  buyerId?: string;
  propertyId?: string;
  defaultTitle: string;
  /** The button, e.g. "משימה לדני". */
  label: string;
  /** The window's title, e.g. "משימה לדני כהן". */
  heading: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ListPlusIcon />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <NewTaskForm
              heading={heading}
              submitLabel="הוסף משימה"
              buyerId={buyerId}
              propertyId={propertyId}
              defaultTitle={defaultTitle}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * A private task: what, when (quick date buttons), optionally who it's about, and details.
 * Used by the card's "משימה ל…" buttons and "משימה חדשה" on the tasks page.
 */
export function NewTaskForm({
  heading,
  submitLabel,
  buyerId,
  propertyId,
  defaultTitle = "",
  onDone,
}: {
  heading: string;
  submitLabel: string;
  buyerId?: string;
  propertyId?: string;
  defaultTitle?: string;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [title, setTitle] = useState(defaultTitle);
  const [due, setDue] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  // Opened from the tasks page (not from a card): the task can still be linked to a buyer or seller.
  const pickLink = !buyerId && !propertyId;
  const [linkKind, setLinkKind] = useState<"none" | "buyer" | "property">("none");
  const [linkId, setLinkId] = useState("");
  const save = useSaveRecord("tasks", { silent: true });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    save.mutate(
      {
        values: {
          title: title.trim(),
          due_at: due,
          description: details.trim() || null,
          buyer_id: buyerId ?? ((linkKind === "buyer" && linkId) || null),
          property_id: propertyId ?? ((linkKind === "property" && linkId) || null),
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
        <DialogTitle className="text-xl font-normal">{heading}</DialogTitle>
        <DialogDescription>תופיע ב״המשימות שלי״. רק אתה רואה אותה.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reminder-title" className="text-xs text-muted-foreground">
            מה לעשות?
          </Label>
          <Input
            id="reminder-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: להתקשר לדני לגבי הדירה בהרצל"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">מתי?</span>
          <QuickDate value={due} onChange={setDue} />
        </div>
        {pickLink && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">קשור ל…</span>
            <Segmented
              value={linkKind}
              onChange={(k) => {
                setLinkKind(k);
                setLinkId("");
              }}
              options={[
                { value: "none", label: "ללא" },
                { value: "buyer", label: "קונה" },
                { value: "property", label: "מוכר" },
              ]}
            />
            {linkKind !== "none" && (
              <RelationSelect kind={linkKind} value={linkId} onChange={setLinkId} id="reminder-link" />
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reminder-details" className="text-xs text-muted-foreground">
            פרטים (לא חובה)
          </Label>
          <Textarea id="reminder-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button type="submit" disabled={!title.trim() || save.isPending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
