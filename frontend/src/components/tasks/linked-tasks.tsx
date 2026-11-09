"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PanelSection } from "@/components/crm/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaveRecord } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type FinishedBuyerTask, LogToBuyerDialog } from "./log-to-buyer-dialog";
import { NewTaskDialog } from "./reminder-button";

/** Recently finished tasks shown under the open ones, as a short history. */
const DONE_SHOWN = 3;

/**
 * The signed-in user's tasks on this buyer or seller (tasks are private), always shown with a
 * "+ משימה" button. Checking off a buyer's task asks what happened, for the call log.
 */
export function LinkedTasks({
  buyer,
  propertyId,
  title,
}: {
  buyer?: { id: string; full_name: string };
  propertyId?: string;
  title: string;
}) {
  const { profile } = useAuth();
  const save = useSaveRecord("tasks", { silent: true });
  const [adding, setAdding] = useState(false);
  const [logFor, setLogFor] = useState<FinishedBuyerTask | null>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "linked", { buyerId: buyer?.id, propertyId }],
    enabled: !!profile,
    queryFn: async (): Promise<(Task & { overdue: boolean })[]> => {
      let q = createClient()
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile!.id)
        .order("due_at", { ascending: true, nullsFirst: false });
      q = buyer ? q.eq("buyer_id", buyer.id) : q.eq("property_id", propertyId!);
      const { data, error } = await q;
      if (error) throw error;
      const now = Date.now();
      return data.map((t) => ({ ...t, overdue: !t.is_done && t.due_at != null && new Date(t.due_at).getTime() < now }));
    },
  });

  const open = tasks.filter((t) => !t.is_done);
  const done = tasks
    .filter((t) => t.is_done)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""))
    .slice(0, DONE_SHOWN);

  return (
    <PanelSection
      title={open.length ? `${title} (${open.length})` : title}
      action={
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon />
          משימה
        </Button>
      }
    >
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין עדיין משימות</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {[...open, ...done].map((t) => {
            const { overdue } = t;
            return (
              <li key={t.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", t.is_done && "text-muted-foreground")}>
                <Checkbox
                  checked={t.is_done}
                  onCheckedChange={(c) => {
                    if (c && buyer) setLogFor({ buyerId: buyer.id, buyerName: buyer.full_name, taskTitle: t.title });
                    save.mutate({ id: t.id, values: { is_done: Boolean(c) } });
                  }}
                  aria-label={t.is_done ? "סמן כלא בוצעה" : "סמן כבוצעה"}
                  className="size-5 rounded-full"
                />
                <Link href={`/tasks?open=${t.id}`} className={cn("min-w-0 flex-1 truncate hover:underline", t.is_done && "line-through")}>
                  {t.title}
                </Link>
                {t.due_at && !t.is_done && (
                  <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", overdue ? "font-medium text-brand-red" : "text-muted-foreground")}>
                    <CalendarIcon className="size-3.5" />
                    {formatDateTime(t.due_at)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NewTaskDialog
        open={adding}
        onClose={() => setAdding(false)}
        heading={buyer ? `משימה על ${buyer.full_name}` : "משימה על הנכס"}
        buyerId={buyer?.id}
        propertyId={propertyId}
      />
      <LogToBuyerDialog task={logFor} onClose={() => setLogFor(null)} />
    </PanelSection>
  );
}
