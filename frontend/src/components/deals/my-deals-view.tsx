"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, HandshakeIcon, TrophyIcon, WalletIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { KpiCard } from "@/components/crm/kpi-card";
import { Money } from "@/components/crm/money";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin } from "@/lib/permissions";
import { DealDialog } from "./deal-dialog";
import { type DealRow, useDeals } from "./deals-data";
import { DealsTable } from "./deals-table";

/** "My deals": each agent sees only their own deals and earnings (RLS); the admin sees all. */
export function MyDealsView() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const { data: deals = [], isLoading, error } = useDeals();
  const [dialog, setDialog] = useState<{ open: boolean; deal: DealRow | null }>({ open: false, deal: null });

  // "This month / this year" depend on today's date, so they're computed in a query.
  const { data: stats } = useQuery({
    queryKey: ["deals", "stats", deals.map((d) => `${d.id}:${d.updated_at}`).join(",")],
    queryFn: () => {
      const now = new Date();
      const yearPrefix = String(now.getFullYear());
      const monthPrefix = `${yearPrefix}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const thisYear = deals.filter((d) => d.closed_on.startsWith(yearPrefix));
      const thisMonth = deals.filter((d) => d.closed_on.startsWith(monthPrefix));
      const sum = (list: DealRow[]) => list.reduce((n, d) => n + Number(d.agent_amount), 0);
      return {
        yearCount: thisYear.length,
        yearEarned: sum(thisYear),
        monthEarned: sum(thisMonth),
        monthCount: thisMonth.length,
        average: thisYear.length ? sum(thisYear) / thisYear.length : null,
      };
    },
  });

  return (
    <>
      <PageHeader
        title={admin ? "כל העסקאות" : "העסקאות שלי"}
        count={deals.length}
        description={admin ? "כל העסקאות שנסגרו במשרד, והחלוקה בין הסוכנים למשרד" : "העסקאות שסגרת והעמלה שמגיעה לך מכל אחת"}
        actions={
          admin && (
            <Button onClick={() => setDialog({ open: true, deal: null })}>
              <HandshakeIcon />
              עסקה שנסגרה
            </Button>
          )
        }
      />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          {/* Four cards of zeros say nothing before the first deal — show them only once there are deals. */}
          {deals.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label={admin ? "עמלות לסוכנים החודש" : "הרווחתי החודש"} value={<Money value={stats?.monthEarned ?? 0} />} note={`${stats?.monthCount ?? 0} עסקאות`} icon={<CalendarIcon />} />
            <KpiCard tone="navy" label={admin ? "עמלות לסוכנים השנה" : "הרווחתי השנה"} value={<Money value={stats?.yearEarned ?? 0} />} icon={<WalletIcon />} />
            <KpiCard label="עסקאות השנה" value={stats?.yearCount ?? 0} icon={<TrophyIcon />} />
            <KpiCard label="ממוצע לעסקה" value={<Money value={stats?.average ?? null} />} note={admin ? "חלק הסוכן" : "החלק שלי"} />
          </div>
          )}

          {deals.length === 0 ? (
            <EmptyState
              icon={<HandshakeIcon />}
              title="עדיין לא נרשמו עסקאות"
              hint={
                admin
                  ? "כשקונה סוגר על נכס, רושמים כאן את העסקה. המערכת מחשבת לבד את חלוקת העמלה בין הסוכן למשרד."
                  : "כשמנהל המשרד ירשום עסקה שסגרת, היא תופיע כאן עם העמלה שלך."
              }
              action={
                admin && (
                  <Button size="lg" onClick={() => setDialog({ open: true, deal: null })}>
                    <HandshakeIcon />
                    רישום עסקה ראשונה
                  </Button>
                )
              }
            />
          ) : (
            <DealsTable deals={deals} showAgent={admin} onOpen={admin ? (d) => setDialog({ open: true, deal: d }) : undefined} />
          )}
        </>
      )}

      {admin && <DealDialog open={dialog.open} deal={dialog.deal} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />}
    </>
  );
}
