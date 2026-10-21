"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClockIcon, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { PanelSection } from "@/components/crm/panel";
import { Segmented } from "@/components/crm/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, Task } from "@/lib/types";

type Kind = "meeting" | "call";
const KIND_TITLE: Record<Kind, string> = { meeting: "ריאיון", call: "שיחת טלפון" };
const KIND_DONE: Record<Kind, string> = { meeting: "הריאיון נקבע", call: "השיחה נקבעה" };

/**
 * Scheduling an interview (in the office or by phone) with a recruiting candidate:
 * creates a task in the admin's own list and marks the candidate "interview scheduled".
 */
export function ScheduleInterviewButton({ candidate }: { candidate: Candidate }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClockIcon />
        קביעת ריאיון / שיחה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open && <ScheduleForm candidate={candidate} onDone={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </>
  );
}

function ScheduleForm({ candidate, onDone }: { candidate: Candidate; onDone: () => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("meeting");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").insert({
      title: `${KIND_TITLE[kind]} עם ${candidate.full_name}`,
      due_at: new Date(when).toISOString(),
      description: [note.trim(), candidate.phone && `טלפון: ${candidate.phone}`].filter(Boolean).join("\n") || null,
      candidate_id: candidate.id,
      assigned_to: profile?.id,
      created_by: profile?.id,
    });
    // A candidate already further along (passed, hired) keeps their status.
    const advance = !error && candidate.status === "new";
    const statusError = advance
      ? (await supabase.from("candidates").update({ status: "interview_scheduled" }).eq("id", candidate.id)).error
      : null;
    setSaving(false);
    if (error || statusError) return toast.error(errorMessage(error ?? statusError));
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["candidates"] });
    toast.success(`${KIND_DONE[kind]} — נוסף ל״המשימות שלי״`);
    onDone();
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">קביעת ריאיון עם {candidate.full_name}</DialogTitle>
        <DialogDescription>נוצרת משימה ב״המשימות שלי״, וסטטוס המועמד מתעדכן ל״נקבע ראיון״.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "meeting", label: "ריאיון במשרד" },
            { value: "call", label: "שיחת טלפון" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="interview-when" className="text-xs text-muted-foreground">
            מתי?
          </Label>
          <Input id="interview-when" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="interview-note" className="text-xs text-muted-foreground">
            הערה (לא חובה)
          </Label>
          <Input id="interview-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: להביא קורות חיים" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button type="submit" disabled={!when || saving}>
          {saving ? "קובע…" : "קבע"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** In the candidate's card: interviews still ahead (open tasks linked to the candidate). */
export function UpcomingInterviews({ candidateId }: { candidateId: string }) {
  const { profile } = useAuth();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "candidate", candidateId],
    enabled: !!profile,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await createClient()
        .from("tasks")
        .select("*")
        .eq("candidate_id", candidateId)
        .eq("is_done", false)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  if (tasks.length === 0) return null;
  return (
    <PanelSection title="ריאיון קרוב">
      <ul className="flex flex-col divide-y rounded-lg border">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <CalendarIcon className="size-4 shrink-0 text-primary" />
            <Link href={`/tasks?open=${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {t.title}
            </Link>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatDateTime(t.due_at)}</span>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
