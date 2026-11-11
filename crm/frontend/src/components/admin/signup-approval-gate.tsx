"use client";

import { CheckIcon, UserPlusIcon, XIcon } from "lucide-react";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllProfiles } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { useSetStatus } from "./agents-view";

/**
 * Admin only: while anyone is waiting for approval, a window that can't be dismissed
 * covers the app until each request is approved or rejected, oldest first.
 * New sign-ups arrive through the notifications bell, which refreshes the profiles list.
 */
export function SignupApprovalGate() {
  const { data: all = [] } = useAllProfiles();
  const setStatus = useSetStatus();
  const pending = all.filter((p) => p.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const next = pending[0];

  return (
    // Escape and outside clicks call onOpenChange; ignoring it keeps the window open.
    <Dialog open={!!next} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {next && (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlusIcon className="size-5" />
              </div>
              <DialogTitle className="text-lg">סוכן חדש מחכה לאישור שלך</DialogTitle>
              <DialogDescription>
                {pending.length > 1
                  ? `יש ${pending.length} בקשות. אחרי ההחלטה על כל אחת תופיע הבאה.`
                  : "עד ההחלטה, החשבון החדש לא רואה שום מידע במערכת."}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <Row label="שם" value={<span className="font-semibold">{next.full_name}</span>} />
              <Row
                label="טלפון"
                value={
                  <span className="flex items-center gap-2">
                    <span dir="ltr">{next.phone || "—"}</span>
                    {next.phone && <WhatsAppButton phone={next.phone} size="icon-sm" label={`וואטסאפ ל${next.full_name}`} />}
                  </span>
                }
              />
              <Row label="אימייל" value={<span dir="ltr">{next.email}</span>} />
              <Row label="נרשם" value={formatRelative(next.created_at)} />
            </dl>

            <div className="grid grid-cols-2 gap-2">
              <Button className="h-10" disabled={setStatus.busy} onClick={() => setStatus.run(next, "active")}>
                <CheckIcon />
                אישור
              </Button>
              <Button variant="outline" className="h-10" disabled={setStatus.busy} onClick={() => setStatus.run(next, "rejected")}>
                <XIcon />
                דחייה
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">אפשר לשנות את ההחלטה אחר כך במסך ״ניהול סוכנים״.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end">{value}</dd>
    </div>
  );
}
