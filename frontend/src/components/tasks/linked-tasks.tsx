"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { PanelSection } from "@/components/crm/panel";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaveRecord } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The signed-in user's open tasks linked to this buyer or seller (tasks are private). */
export function LinkedTasks({ buyerId, propertyId, title }: { buyerId?: string; propertyId?: string; title: string }) {
  const { profile } = useAuth();
  const save = useSaveRecord("tasks", { silent: true });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "linked", { buyerId, propertyId }],
    enabled: !!profile,
    queryFn: async (): Promise<(Task & { overdue: boolean })[]> => {
      let q = createClient()
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile!.id)
        .eq("is_done", false)
        .order("due_at", { ascending: true, nullsFirst: false });
      q = buyerId ? q.eq("buyer_id", buyerId) : q.eq("property_id", propertyId!);
      const { data, error } = await q;
      if (error) throw error;
      const now = Date.now();
      return data.map((t) => ({ ...t, overdue: t.due_at != null && new Date(t.due_at).getTime() < now }));
    },
  });

  if (tasks.length === 0) return null;

  return (
    <PanelSection title={`${title} (${tasks.length})`}>
      <ul className="flex flex-col divide-y rounded-lg border">
        {tasks.map((t) => {
          const { overdue } = t;
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <Checkbox
                checked={false}
                onCheckedChange={() => save.mutate({ id: t.id, values: { is_done: true } })}
                aria-label="סמן כבוצעה"
                className="size-5 rounded-full"
              />
              <Link href={`/tasks?open=${t.id}`} className="min-w-0 flex-1 truncate hover:underline">
                {t.title}
              </Link>
              {t.due_at && (
                <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", overdue ? "font-medium text-brand-red" : "text-muted-foreground")}>
                  <CalendarIcon className="size-3.5" />
                  {formatDateTime(t.due_at)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
