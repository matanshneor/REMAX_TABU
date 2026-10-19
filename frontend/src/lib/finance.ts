import type { Transaction } from "./types";

export type PeriodKind = "month" | "quarter" | "year";

export type Period = { kind: PeriodKind; start: Date; end: Date };

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const MONTHS_SHORT = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

/** The period of `kind` that contains `anchor`. `end` is exclusive. */
export function periodOf(kind: PeriodKind, anchor: Date): Period {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  if (kind === "month") return { kind, start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
  if (kind === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { kind, start: new Date(y, q, 1), end: new Date(y, q + 3, 1) };
  }
  return { kind, start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
}

/** The period `steps` periods before/after this one. */
export function shiftPeriod(p: Period, steps: number): Period {
  const months = p.kind === "month" ? 1 : p.kind === "quarter" ? 3 : 12;
  return periodOf(p.kind, new Date(p.start.getFullYear(), p.start.getMonth() + steps * months, 1));
}

export function periodLabel(p: Period): string {
  const y = p.start.getFullYear();
  if (p.kind === "month") return `${MONTHS[p.start.getMonth()]} ${y}`;
  if (p.kind === "quarter") return `רבעון ${Math.floor(p.start.getMonth() / 3) + 1} · ${y}`;
  return String(y);
}

/** "מהחודש הקודם" / "מהרבעון הקודם" / "מהשנה הקודמת" */
export function previousLabel(kind: PeriodKind): string {
  return kind === "month" ? "מהחודש הקודם" : kind === "quarter" ? "מהרבעון הקודם" : "מהשנה הקודמת";
}

/** occurred_on is a yyyy-mm-dd date; compare as local dates. */
function dateOf(t: Transaction): Date {
  const [y, m, d] = t.occurred_on.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function inPeriod(rows: Transaction[], p: Period): Transaction[] {
  return rows.filter((t) => {
    const d = dateOf(t);
    return d >= p.start && d < p.end;
  });
}

export type Totals = { income: number; expense: number; net: number; count: number };

export function totals(rows: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of rows) {
    if (t.type === "income") income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return { income, expense, net: income - expense, count: rows.length };
}

/** Relative change, or null when there's no base to compare to. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export type MonthPoint = { key: string; label: string; income: number; expense: number; net: number };

/** The 12 calendar months ending with the month that contains `lastDay`. */
export function monthlySeries(rows: Transaction[], lastDay: Date): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(lastDay.getFullYear(), lastDay.getMonth() - i, 1);
    const t = totals(inPeriod(rows, { kind: "month", start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) }));
    const yy = String(start.getFullYear()).slice(2);
    points.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: `${MONTHS_SHORT[start.getMonth()]} ${yy}`,
      income: t.income,
      expense: t.expense,
      net: t.net,
    });
  }
  return points;
}

export type Slice = { name: string; value: number };

/** Sum by a key, largest first; everything past `max - 1` folds into "אחר". */
export function breakdown(rows: Transaction[], keyOf: (t: Transaction) => string, max = 6): Slice[] {
  const sums = new Map<string, number>();
  for (const t of rows) sums.set(keyOf(t), (sums.get(keyOf(t)) ?? 0) + Number(t.amount));
  const sorted = [...sums.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const rest = sorted.slice(max - 1).reduce((n, s) => n + s.value, 0);
  return [...sorted.slice(0, max - 1), { name: "אחר", value: rest }];
}
