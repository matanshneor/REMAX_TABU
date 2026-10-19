"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HandshakeIcon,
  PaperclipIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { BreakdownBars, ChartCard, MonthlyChart, SERIES } from "@/components/finance/finance-charts";
import { CreateDialog } from "@/components/crm/create-dialog";
import { ExportButton } from "@/components/crm/export-button";
import { FileAttachment } from "@/components/crm/file-attachment";
import { KpiCard } from "@/components/crm/kpi-card";
import { Money } from "@/components/crm/money";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { FilterChip, Segmented } from "@/components/crm/segmented";
import { StatusBadge } from "@/components/crm/status-badge";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentName, useDeleteRecord, useSaveRecord } from "@/lib/data";
import {
  breakdown,
  change,
  inPeriod,
  monthlySeries,
  type PeriodKind,
  periodLabel,
  periodOf,
  previousLabel,
  shiftPeriod,
  needsReceipt,
  totals,
} from "@/lib/finance";
import { formatDate, toDateInput } from "@/lib/format";
import { toOptions, TRANSACTION_CATEGORIES, TRANSACTION_TYPE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { AgentRates } from "@/components/deals/agent-rates";
import { DealDialog } from "@/components/deals/deal-dialog";
import { type DealRow, useDeals } from "@/components/deals/deals-data";
import { DealsTable } from "@/components/deals/deals-table";
import { SimpleTable } from "./simple-table";

const TX_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "type", label: "סוג", type: "select", options: toOptions(TRANSACTION_TYPE), required: true, span: 2 },
      { name: "amount", label: "סכום", type: "currency", required: true, span: 2 },
      { name: "occurred_on", label: "תאריך", type: "date", required: true, span: 2 },
      { name: "category", label: "קטגוריה", type: "text", required: true, suggestions: TRANSACTION_CATEGORIES },
      { name: "agent_id", label: "סוכן", type: "agent" },
      { name: "property_id", label: "נכס", type: "property" },
      { name: "buyer_id", label: "קונה", type: "buyer" },
      { name: "notes", label: "הערות", type: "textarea", span: 6 },
    ],
  },
];

/** What the table below the charts shows; the KPI cards switch it. */
type View = "all" | "income" | "expense" | "missing";

const VIEW_TITLE: Record<View, string> = {
  all: "כל התנועות",
  income: "הכנסות",
  expense: "הוצאות",
  missing: "הוצאות בלי קבלה",
};

export function FinanceView() {
  const agentName = useAgentName();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<View>("all");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const [dealDialog, setDealDialog] = useState<{ open: boolean; deal: DealRow | null }>({ open: false, deal: null });
  const { data: deals = [] } = useDeals();

  const { data: all = [], isLoading, error } = useQuery({
    queryKey: ["financial_transactions", "list"],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await createClient()
        .from("financial_transactions")
        .select("*")
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const period = useMemo(() => periodOf(kind, anchor), [kind, anchor]);
  const current = useMemo(() => inPeriod(all, period), [all, period]);
  const now = totals(current);
  const before = totals(inPeriod(all, shiftPeriod(period, -1)));
  const label = periodLabel(period);
  const periodDeals = deals.filter((d) => {
    const [y, m, day] = d.closed_on.split("-").map(Number);
    const date = new Date(y, m - 1, day);
    return date >= period.start && date < period.end;
  });

  // The 12-month chart ends with the selected period; the selected month is highlighted.
  const monthly = useMemo(
    () => monthlySeries(all, new Date(period.end.getFullYear(), period.end.getMonth() - 1, 1)),
    [all, period],
  );
  const highlightKey = kind === "month" ? `${period.start.getFullYear()}-${period.start.getMonth()}` : undefined;

  const expensesByCategory = breakdown(current.filter((t) => t.type === "expense"), (t) => t.category);
  const incomeByAgent = breakdown(current.filter((t) => t.type === "income"), (t) => (t.agent_id ? agentName(t.agent_id) : "ללא סוכן"));

  const categories = useMemo(() => [...new Set(all.map((t) => t.category))].sort(), [all]);
  const rows = current.filter((t) => {
    if (view === "income" && t.type !== "income") return false;
    if (view === "expense" && t.type !== "expense") return false;
    if (view === "missing" && !needsReceipt(t)) return false;
    if (category && t.category !== category) return false;
    const q = text.trim().toLowerCase();
    return !q || [t.category, t.notes, t.agent_id && agentName(t.agent_id)].some((s) => s?.toLowerCase().includes(q));
  });
  const rowsTotal = rows.reduce((s, t) => s + (t.type === "income" ? 1 : -1) * Number(t.amount), 0);

  function openView(next: View) {
    setView((v) => (v === next && next !== "all" ? "all" : next));
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageHeader
        title="הנהלת חשבונות"
        description="הכנסות, הוצאות ורווח של המשרד — לפי חודש, רבעון או שנה"
        actions={
          <>
            <ExportButton entity="financial_transactions" />
            <Button variant="outline" onClick={() => setCreating(true)}>
              <PlusIcon />
              תנועה חדשה
            </Button>
            <Button onClick={() => setDealDialog({ open: true, deal: null })}>
              <HandshakeIcon />
              עסקה שנסגרה
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "month", label: "חודש" },
            { value: "quarter", label: "רבעון" },
            { value: "year", label: "שנה" },
          ]}
        />
        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(shiftPeriod(period, -1).start)} aria-label="התקופה הקודמת">
            <ChevronRightIcon />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold">{label}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(shiftPeriod(period, 1).start)} aria-label="התקופה הבאה">
            <ChevronLeftIcon />
          </Button>
        </div>
        <Button variant="link" size="sm" onClick={() => setAnchor(new Date())}>
          חזרה להיום
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard
              label="הכנסות"
              value={<Money value={now.income} />}
              icon={<TrendingUpIcon />}
              note={<Delta value={change(now.income, before.income)} kind={kind} />}
              onClick={() => openView("income")}
              selected={view === "income"}
            />
            <KpiCard
              tone="red"
              label="הוצאות"
              value={<Money value={now.expense} />}
              icon={<TrendingDownIcon />}
              note={<Delta value={change(now.expense, before.expense)} kind={kind} upIsGood={false} />}
              onClick={() => openView("expense")}
              selected={view === "expense"}
            />
            <KpiCard
              tone="navy"
              label="רווח נקי"
              value={<Money value={now.net} />}
              icon={<WalletIcon />}
              note={now.income ? `${Math.round((now.net / now.income) * 100)}% מההכנסות` : undefined}
              noteTone={now.net < 0 ? "red" : "muted"}
              onClick={() => openView("all")}
              selected={view === "all"}
            />
            <KpiCard
              tone={now.missingReceipts ? "red" : "blue"}
              label="הוצאות בלי קבלה"
              value={now.missingReceipts}
              icon={<ReceiptIcon />}
              note={now.missingReceipts ? "לצרף לפני הדוח לרואה החשבון" : "הכל מתועד"}
              noteTone={now.missingReceipts ? "red" : "green"}
              onClick={() => openView("missing")}
              selected={view === "missing"}
            />
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="הכנסות והוצאות לפי חודש"
              subtitle="12 החודשים האחרונים עד התקופה שנבחרה"
              legend={[
                { label: "הכנסות", color: SERIES.income },
                { label: "הוצאות", color: SERIES.expense },
              ]}
            >
              <MonthlyChart data={monthly} highlightKey={highlightKey} />
            </ChartCard>
            <ChartCard title="לאן הולך הכסף" subtitle={`הוצאות לפי קטגוריה · ${label}`}>
              <BreakdownBars data={expensesByCategory} color={SERIES.expense} emptyText="אין הוצאות בתקופה הזו" />
            </ChartCard>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-3">
            <ChartCard title="מקור ההכנסות" subtitle={`הכנסות לפי סוכן · ${label}`}>
              <BreakdownBars data={incomeByAgent} color={SERIES.income} emptyText="אין הכנסות בתקופה הזו" />
            </ChartCard>
            <ChartCard className="xl:col-span-2" title="סיכום לפי קטגוריה" subtitle={label}>
              <CategorySummary rows={current} onPick={(c) => (setCategory(c), openView("all"))} />
            </ChartCard>
          </div>

          <div className="mb-6 grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="עסקאות שנסגרו"
              subtitle={`${periodDeals.length} עסקאות · ${label} · לחץ על עסקה כדי לערוך אותה`}
            >
              {periodDeals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <HandshakeIcon className="size-6" />
                  לא נרשמו עסקאות בתקופה הזו
                  <Button size="sm" onClick={() => setDealDialog({ open: true, deal: null })}>
                    רשום עסקה שנסגרה
                  </Button>
                </div>
              ) : (
                <DealsTable deals={periodDeals} showAgent onOpen={(d) => setDealDialog({ open: true, deal: d })} />
              )}
            </ChartCard>
            <ChartCard title="אחוזי העמלה של הסוכנים" subtitle="האחוז הקבוע שמופיע אוטומטית בעסקה חדשה">
              <AgentRates />
            </ChartCard>
          </div>

          <div ref={tableRef} className="scroll-mt-20">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  {VIEW_TITLE[view]} · {label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {rows.length} תנועות · סה״כ{" "}
                  <Money
                    value={view === "all" ? rowsTotal : Math.abs(rowsTotal)}
                    signed={view === "all"}
                    className="font-semibold text-foreground"
                  />
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "income", "expense", "missing"] as View[]).map((v) => (
                  <FilterChip key={v} active={view === v} onClick={() => setView(v)}>
                    {VIEW_TITLE[v]}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="חיפוש בהערות, קטגוריה, סוכן…" className="ps-8" />
              </div>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} className="w-full sm:w-48" aria-label="קטגוריה">
                <option value="">כל הקטגוריות</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {rows.length === 0 ? (
              <EmptyState icon={<WalletIcon />} title={`אין ${VIEW_TITLE[view]} ב${label}`} hint="אפשר לבחור תקופה אחרת או להוסיף תנועה חדשה." />
            ) : (
              <SimpleTable
                rows={rows}
                selectedId={openId}
                // Rows created from a deal are edited through the deal, so both sides stay in sync.
                onRowClick={(t) => {
                  const fromDeal = t.deal_id && deals.find((d) => d.id === t.deal_id);
                  if (fromDeal) setDealDialog({ open: true, deal: fromDeal });
                  else setOpenId(t.id);
                }}
                columns={[
                  { header: "תאריך", cell: (t) => formatDate(t.occurred_on), className: "tabular-nums" },
                  { header: "סוג", cell: (t) => <StatusBadge map={TRANSACTION_TYPE} value={t.type} /> },
                  {
                    header: "קטגוריה",
                    cell: (t) => (
                      <span className="flex items-center gap-1.5">
                        {t.category}
                        {t.deal_id && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                            <HandshakeIcon className="size-3" />
                            עסקה
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    header: "סכום",
                    cell: (t) => (
                      <span className={cn("font-semibold", t.type === "expense" ? "text-brand-red" : "text-emerald-700")}>
                        <Money value={t.type === "expense" ? -Number(t.amount) : Number(t.amount)} signed />
                      </span>
                    ),
                  },
                  { header: "סוכן", cell: (t) => (t.agent_id ? agentName(t.agent_id) : "—") },
                  {
                    header: "קבלה",
                    cell: (t) =>
                      t.receipt_path ? (
                        <PaperclipIcon className="mx-auto size-4 text-muted-foreground" aria-label="יש קבלה" />
                      ) : needsReceipt(t) ? (
                        // One click to the place where the receipt is attached.
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-red-200 text-brand-red hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(t.id);
                          }}
                        >
                          <PaperclipIcon />
                          צירוף קבלה
                        </Button>
                      ) : null,
                    className: "text-center",
                  },
                  { header: "הערות", cell: (t) => <span className="line-clamp-1 text-muted-foreground">{t.notes}</span> },
                ]}
              />
            )}
          </div>
        </>
      )}

      <CreateDialog<Transaction>
        open={creating}
        onOpenChange={setCreating}
        title="תנועה כספית חדשה"
        table="financial_transactions"
        sections={TX_SECTIONS}
        initial={{ type: view === "expense" || view === "missing" ? "expense" : "income", occurred_on: toDateInput(new Date()) }}
        onCreated={(t) => setOpenId(t.id)}
      />
      <TransactionPanel tx={all.find((t) => t.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <DealDialog open={dealDialog.open} deal={dealDialog.deal} onOpenChange={(open) => setDealDialog((d) => ({ ...d, open }))} />
    </>
  );
}

/** "▲ 12% מהחודש הקודם" — green when the change is good (more income, less expense). */
function Delta({ value, kind, upIsGood = true }: { value: number | null; kind: PeriodKind; upIsGood?: boolean }) {
  if (value == null) return <span className="text-muted-foreground">אין נתון להשוואה</span>;
  const up = value >= 0;
  const good = up === upIsGood;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-emerald-700" : "text-brand-red")}>
      {up ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />}
      {Math.abs(Math.round(value * 100))}%<span className="font-normal text-muted-foreground"> {previousLabel(kind)}</span>
    </span>
  );
}

/** Income and expense per category for the period — the table view behind the charts. */
function CategorySummary({ rows, onPick }: { rows: Transaction[]; onPick: (category: string) => void }) {
  const byCategory = new Map<string, { income: number; expense: number; count: number }>();
  for (const t of rows) {
    const c = byCategory.get(t.category) ?? { income: 0, expense: 0, count: 0 };
    c[t.type] += Number(t.amount);
    c.count += 1;
    byCategory.set(t.category, c);
  }
  const list = [...byCategory.entries()].sort((a, b) => b[1].income + b[1].expense - (a[1].income + a[1].expense));
  if (list.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">אין תנועות בתקופה הזו</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs text-muted-foreground">
          <th className="py-2 text-start font-medium">קטגוריה</th>
          <th className="py-2 text-start font-medium">תנועות</th>
          <th className="py-2 text-start font-medium">הכנסות</th>
          <th className="py-2 text-start font-medium">הוצאות</th>
        </tr>
      </thead>
      <tbody>
        {list.map(([name, c]) => (
          <tr key={name} className="border-b last:border-0">
            <td className="py-2">
              <button type="button" onClick={() => onPick(name)} className="font-medium hover:text-primary hover:underline">
                {name}
              </button>
            </td>
            <td className="py-2 tabular-nums text-muted-foreground">{c.count}</td>
            <td className="py-2">{c.income ? <Money value={c.income} className="text-emerald-700" /> : "—"}</td>
            <td className="py-2">{c.expense ? <Money value={c.expense} className="text-brand-red" /> : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionPanel({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const form = useFormValues(TX_SECTIONS, tx, `${tx?.id}:${tx?.updated_at}`);
  const save = useSaveRecord("financial_transactions");
  const remove = useDeleteRecord("financial_transactions");
  return (
    <Panel
      dirty={form.dirty}
      open={!!tx}
      onClose={onClose}
      title={
        tx && (
          <>
            {TRANSACTION_TYPE[tx.type].label} · <Money value={Number(tx.amount)} />
          </>
        )
      }
      subtitle={tx && `${tx.category} · ${formatDate(tx.occurred_on)}`}
      footer={
        tx && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            onSave={() => save.mutate({ id: tx.id, values: form.changes })}
            onReset={form.reset}
            onDelete={() => remove.mutate(tx.id, { onSuccess: onClose })}
          />
        )
      }
    >
      {tx && (
        <>
          <EntityForm sections={TX_SECTIONS} values={form.values} onChange={form.set} idPrefix="tx" />
          <FileAttachment
            title="חשבונית / קבלה"
            table="financial_transactions"
            rowId={tx.id}
            column="receipt_path"
            path={tx.receipt_path}
            bucket="invoices"
            accept="image/*,application/pdf"
          />
        </>
      )}
    </Panel>
  );
}
