"use client";

import { useQuery } from "@tanstack/react-query";
import { EyeIcon, ListChecksIcon, UsersIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { KpiBadge, KpiCard } from "@/components/crm/kpi-card";
import { createClient } from "@/lib/supabase/client";
import { isActiveBuyer } from "@/lib/labels";
import type { Buyer } from "@/lib/types";

const WEEK_MS = 7 * 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Four summary cards above the buyers table. Time windows are computed at fetch time. */
export function BuyersKpis({ buyers }: { buyers: Buyer[] }) {
  const { profile } = useAuth();

  // Buyer-derived numbers depend on "now", so they're computed in a query keyed by the list.
  const { data: stats } = useQuery({
    queryKey: ["buyers", "kpis", buyers.map((b) => `${b.id}:${b.updated_at}`).join(",")],
    queryFn: () => {
      const today = startOfToday().getTime();
      const weekAgo = Date.now() - WEEK_MS;
      return {
        total: buyers.length,
        active: buyers.filter(isActiveBuyer).length,
        addedToday: buyers.filter((b) => new Date(b.created_at).getTime() >= today).length,
        newThisWeek: buyers.filter((b) => new Date(b.created_at).getTime() >= weekAgo).length,
      };
    },
  });

  const { data: viewings } = useQuery({
    queryKey: ["buyer_property_viewings", "count", "week"],
    queryFn: async () => {
      const { count, error } = await createClient()
        .from("buyer_property_viewings")
        .select("id", { count: "exact", head: true })
        .gte("viewed_at", new Date(Date.now() - WEEK_MS).toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", "kpi", "today"],
    enabled: !!profile,
    queryFn: async () => {
      const endOfToday = new Date(startOfToday().getTime() + 86_400_000).toISOString();
      const { data, error } = await createClient()
        .from("tasks")
        .select("due_at")
        .eq("assigned_to", profile!.id)
        .eq("is_done", false)
        .lt("due_at", endOfToday);
      if (error) throw error;
      const now = Date.now();
      return { dueToday: data.length, overdue: data.filter((t) => new Date(t.due_at!).getTime() < now).length };
    },
  });

  const s = stats ?? { total: 0, active: 0, addedToday: 0, newThisWeek: 0 };
  const overdue = tasks?.overdue ?? 0;

  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="קונים בטיפול"
        value={s.active}
        note={`מתוך ${s.total} במאגר`}
        badge={
          s.addedToday > 0 ? (
            <KpiBadge tone="green">+{s.addedToday} היום</KpiBadge>
          ) : (
            <UsersIcon className="size-5 text-muted-foreground/70" />
          )
        }
      />
      <KpiCard
        label="חדשים השבוע"
        value={s.newThisWeek}
        note={`מתוך ${s.total} קונים`}
        badge={s.newThisWeek > 0 ? <KpiBadge tone="green">חדש</KpiBadge> : undefined}
        progress={s.total ? s.newThisWeek / s.total : 0}
      />
      <KpiCard
        label="צפיות השבוע"
        value={viewings ?? "—"}
        note="צפיות שתועדו"
        icon={<EyeIcon />}
        progress={Math.min((viewings ?? 0) / 10, 1)}
      />
      <KpiCard
        tone={overdue ? "red" : "navy"}
        label="משימות להיום"
        value={tasks?.dueToday ?? "—"}
        note={overdue ? `${overdue} באיחור` : "הכל בזמן"}
        noteTone={overdue ? "red" : "muted"}
        icon={<ListChecksIcon />}
        progress={tasks?.dueToday ? 1 - tasks.overdue / tasks.dueToday : 0}
      />
    </div>
  );
}
