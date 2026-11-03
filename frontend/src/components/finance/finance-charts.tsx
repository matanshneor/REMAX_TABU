"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Money } from "@/components/crm/money";
import type { MonthPoint, Slice } from "@/lib/finance";

/**
 * Chart colors. Brand blue (#1b4a97) is too dark for a data mark, so incomes use a lighter
 * step of it; expenses use orange. Validated with the dataviz palette checker (all checks pass).
 */
export const SERIES = { income: "#2f63c0", expense: "#eb6834" } as const;

/**
 * Axis labels in words, so "160 א׳" isn't read as "Sunday": "160 אלף ₪", "1.2 מיליון ₪".
 * Wrapped in an RTL embedding because the chart itself is laid out left-to-right.
 */
const rtl = (s: string) => `\u202B${s}\u202C`;
const compact = (n: number) =>
  n >= 1_000_000
    ? rtl(`${Number((n / 1_000_000).toFixed(1))} מיליון ₪`)
    : n >= 1_000
      ? rtl(`${Math.round(n / 1_000)} אלף ₪`)
      : n === 0
        ? "0"
        : rtl(`${n} ₪`);

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-4 shadow-card ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {legend && (
          <ul className="flex items-center gap-3 text-xs text-muted-foreground">
            {legend.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px]" style={{ background: l.color }} />
                {l.label}
              </li>
            ))}
          </ul>
        )}
      </header>
      {children}
    </section>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: number; color?: string; signed?: boolean }[] }) {
  return (
    <div dir="rtl" className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} />}
              {r.label}
            </span>
            <Money value={r.value} signed={r.signed} className="font-semibold text-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Incomes vs expenses for the last 12 months (grouped bars, one shared ₪ axis). */
export function MonthlyChart({ data, highlightKey }: { data: MonthPoint[]; highlightKey?: string }) {
  return (
    <div dir="ltr" className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {/* RTL: time runs right → left, the value axis sits on the right */}
          <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={axisTick} interval="preserveStartEnd" minTickGap={8} />
          <YAxis orientation="right" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={compact} width={72} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as MonthPoint;
              return (
                <TooltipBox
                  title={p.label}
                  rows={[
                    { label: "הכנסות", value: p.income, color: SERIES.income },
                    { label: "הוצאות", value: p.expense, color: SERIES.expense },
                    { label: "רווח נקי", value: p.net, signed: true },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="income" name="הכנסות" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {/* fade months other than the selected one so the current period stands out */}
            {data.map((d) => (
              <Cell key={d.key} fillOpacity={highlightKey && d.key !== highlightKey ? 0.45 : 1} />
            ))}
          </Bar>
          <Bar dataKey="expense" name="הוצאות" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((d) => (
              <Cell key={d.key} fillOpacity={highlightKey && d.key !== highlightKey ? 0.45 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Ranked horizontal bars for one series (e.g. expenses by category), as plain HTML so the
 * RTL layout is exact: name on the right, bar growing leftwards, value directly at its end.
 */
export function BreakdownBars({ data, color, emptyText }: { data: Slice[]; color: string; emptyText: string }) {
  if (data.length === 0) {
    return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  const max = Math.max(...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => (
        <li
          key={d.name}
          className="group grid grid-cols-[6.5rem_1fr] items-center gap-3 text-sm"
          title={`${d.name}: ${Math.round((d.value / total) * 100)}% מהסך הכל`}
        >
          <span className="truncate font-medium">{d.name}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-5 rounded-s-[4px] rounded-e-[4px] transition-opacity group-hover:opacity-85"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, background: color }}
            />
            <Money value={d.value} compact className="shrink-0 text-xs font-semibold text-muted-foreground" />
          </span>
        </li>
      ))}
    </ul>
  );
}
