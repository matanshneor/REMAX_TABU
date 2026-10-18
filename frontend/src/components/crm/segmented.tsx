"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-lg bg-muted p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-full items-center gap-1.5 rounded-md px-3 font-medium transition-colors",
            value === o.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count != null && <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
  dotClassName,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Small count badge after the label. */
  count?: number;
  /** Optional colored dot before the label (e.g. red for "hot"). */
  dotClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-transparent bg-muted/70 text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      {dotClassName && <span className={cn("size-2 rounded-full", dotClassName)} />}
      {children}
      {count != null && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-background text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
