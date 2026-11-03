import { cn } from "@/lib/utils";

/**
 * Summary card above a table: label, big number, a short note and a thin progress bar.
 * `tone` colors the top edge and the bar (red is reserved for urgent things).
 * With `onClick` the card becomes a button (e.g. "show only incomes").
 */
export function KpiCard({
  label,
  value,
  note,
  noteTone = "muted",
  badge,
  icon,
  progress,
  tone = "blue",
  onClick,
  selected,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  noteTone?: "muted" | "red" | "green";
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  /** 0–1 */
  progress?: number;
  tone?: "blue" | "red" | "navy";
  onClick?: () => void;
  selected?: boolean;
}) {
  const bar = { blue: "bg-primary", red: "bg-brand-red", navy: "bg-sidebar" }[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4 text-start shadow-card outline-none transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        onClick && "cursor-pointer",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", bar)} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {badge ?? (icon && <span className="text-muted-foreground/70 [&_svg]:size-5">{icon}</span>)}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            "font-display leading-none whitespace-nowrap tabular-nums",
            typeof value === "string" && value.length > 6 ? "text-3xl" : "text-4xl",
          )}
        >
          {value}
        </span>
        {note && (
          <span
            className={cn(
              "text-sm",
              noteTone === "red" ? "font-medium text-brand-red" : noteTone === "green" ? "font-medium text-emerald-700" : "text-muted-foreground",
            )}
          >
            {note}
          </span>
        )}
      </div>
      {progress != null && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none", bar)}
            style={{ width: `${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}%` }}
          />
        </div>
      )}
    </Tag>
  );
}

export function KpiBadge({ tone, children }: { tone: "red" | "green"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold",
        tone === "red" ? "bg-red-50 text-brand-red" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {children}
    </span>
  );
}
