"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2Icon, CalendarIcon, ChevronDownIcon, ListChecksIcon, PlusIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/data";
import { formatFullAddress } from "@/lib/format";
import { canEditTask } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { CalendarSyncButton } from "./calendar-sync";
import { type FinishedBuyerTask, LogToBuyerDialog } from "./log-to-buyer-dialog";
import { TaskContactActions } from "./task-contact-actions";
import { NewTaskDialog } from "./reminder-button";
import { TaskPanel } from "./task-panel";

const LIST_KEY = ["tasks", "list"];
const COMPLETE_DELAY_MS = 450;

/** Tasks are private: only the signed-in user's own list (also enforced by RLS). */
async function fetchTasks(userId: string) {
  const { data, error } = await createClient()
    .from("tasks")
    .select(
      "*, buyers(id, full_name, phone), properties(id, street, house_number, apartment_number, city, property_owner_details(owner_name, owner_phone))",
    )
    .eq("assigned_to", userId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

type TaskRow = Awaited<ReturnType<typeof fetchTasks>>[number];
type GroupKey = "overdue" | "today" | "tomorrow" | "upcoming" | "someday" | "done";

const GROUPS: { key: GroupKey; label: string; tone?: string }[] = [
  { key: "overdue", label: "באיחור", tone: "text-brand-red" },
  { key: "today", label: "היום" },
  { key: "tomorrow", label: "מחר" },
  { key: "upcoming", label: "בהמשך" },
  { key: "someday", label: "ללא מועד" },
  { key: "done", label: "הושלמו" },
];

function groupOf(t: TaskRow, now: Date): GroupKey {
  if (t.is_done) return "done";
  if (!t.due_at) return "someday";
  const due = new Date(t.due_at);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000);
  const startOfDayAfter = new Date(startOfToday.getTime() + 2 * 86_400_000);
  if (due < now) return "overdue";
  if (due < startOfTomorrow) return "today";
  if (due < startOfDayAfter) return "tomorrow";
  return "upcoming";
}

function dueLabel(iso: string, group: GroupKey) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (group === "today" || group === "tomorrow") return time;
  return d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric" }) + ` ${time}`;
}

export function TasksView() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [showDone, setShowDone] = useState(false);
  // Tasks being checked off play a short strike-through + fade before moving to "done".
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [logFor, setLogFor] = useState<FinishedBuyerTask | null>(null);

  function setDone(id: string, is_done: boolean) {
    if (!is_done || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      toggle.mutate({ id, is_done });
      return;
    }
    setCompleting((s) => new Set(s).add(id));
    window.setTimeout(() => {
      toggle.mutate({ id, is_done: true });
      setCompleting((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, COMPLETE_DELAY_MS);
  }

  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: LIST_KEY,
    enabled: !!profile,
    queryFn: () => fetchTasks(profile!.id),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { data, error } = await createClient().from("tasks").update({ is_done }).eq("id", id).select("id").single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, is_done }) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const previous = qc.getQueryData<TaskRow[]>(LIST_KEY);
      qc.setQueryData<TaskRow[]>(LIST_KEY, (old) => old?.map((t) => (t.id === id ? { ...t, is_done } : t)));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(LIST_KEY, ctx?.previous);
      toast.error(errorMessage(e));
    },
    onSuccess: (_d, { id, is_done }) => {
      if (is_done) toast.success("המשימה סומנה כבוצעה", { action: { label: "ביטול", onClick: () => toggle.mutate({ id, is_done: false }) } });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const grouped = useMemo(() => {
    const now = new Date();
    const map = new Map<GroupKey, TaskRow[]>(GROUPS.map((g) => [g.key, []]));
    for (const t of tasks) map.get(groupOf(t, now))!.push(t);
    map.get("done")!.sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
    return map;
  }, [tasks]);

  const openCount = tasks.filter((t) => !t.is_done).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="המשימות שלי"
        count={openCount}
        description="רשימה אישית: רק אתה רואה את המשימות שלך"
        actions={
          <>
            <CalendarSyncButton />
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              משימה חדשה
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecksIcon />}
          title="אין משימות"
          hint="לחץ על ״משימה חדשה״ למעלה כדי להוסיף את הראשונה."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {GROUPS.map(({ key, label, tone }) => {
            const items = grouped.get(key)!;
            if (!items.length) return null;
            const isDone = key === "done";
            return (
              <section key={key}>
                <button
                  className={cn(
                    "mb-2 flex items-center gap-2 text-sm font-semibold",
                    tone,
                    isDone && "text-muted-foreground",
                  )}
                  onClick={() => isDone && setShowDone((s) => !s)}
                  disabled={!isDone}
                >
                  {isDone && (
                    <ChevronDownIcon
                      className={cn("size-4 transition-transform", !showDone && "rotate-90 rtl:-rotate-90")}
                    />
                  )}
                  {label}
                  <span className="font-normal text-muted-foreground tabular-nums">{items.length}</span>
                </button>
                {(!isDone || showDone) && (
                  <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                    {items.map((t) => {
                      const done = t.is_done || completing.has(t.id);
                      return (
                        <li
                          key={t.id}
                          onClick={() => setOpenId(t.id)}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-4 py-3 transition-[background-color,opacity] duration-300 hover:bg-muted/50",
                            openId === t.id && "bg-primary/5",
                            completing.has(t.id) && "opacity-50 delay-150",
                          )}
                        >
                          <span onClick={(e) => e.stopPropagation()} className="flex">
                            <Checkbox
                              checked={done}
                              disabled={!canEditTask(profile, t) || completing.has(t.id)}
                              onCheckedChange={(c) => {
                                // Checking off a task linked to a buyer asks what happened, for their call log.
                                if (c && t.buyers) setLogFor({ buyerId: t.buyers.id, buyerName: t.buyers.full_name, taskTitle: t.title });
                                setDone(t.id, Boolean(c));
                              }}
                              aria-label={done ? "סמן כלא בוצעה" : "סמן כבוצעה"}
                              className="size-5 rounded-full"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {/* A line drawn across the title (right to left), instead of an instant line-through */}
                              <span
                                className={cn(
                                  "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-[position:right_center] bg-no-repeat transition-[background-size,color] duration-300 ease-out motion-reduce:transition-none",
                                  done && "bg-[length:100%_1.5px] text-muted-foreground",
                                )}
                              >
                                {t.title}
                              </span>
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {t.buyers && (
                                <Link
                                  href={`/buyers?open=${t.buyers.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                                >
                                  <UserIcon className="size-3" />
                                  {t.buyers.full_name}
                                </Link>
                              )}
                              {t.properties && (
                                <Link
                                  href={`/properties?open=${t.properties.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                                >
                                  <Building2Icon className="size-3" />
                                  {formatFullAddress(t.properties)}
                                </Link>
                              )}
                            </div>
                          </div>
                          {!t.is_done && (
                            <TaskContactActions
                              buyer={t.buyers}
                              property={t.properties && { ...t.properties, seller: t.properties.property_owner_details }}
                            />
                          )}
                          {t.due_at && !t.is_done && (
                            <span
                              className={cn(
                                "flex shrink-0 items-center gap-1 text-xs tabular-nums",
                                key === "overdue" ? "font-medium text-brand-red" : "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="size-3.5" />
                              {dueLabel(t.due_at, key)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* "?new=1" (e.g. from a link) opens this too. */}
      <NewTaskDialog open={creating} onClose={() => setCreating(false)} heading="משימה חדשה" />
      <LogToBuyerDialog task={logFor} onClose={() => setLogFor(null)} />
      <TaskPanel id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
