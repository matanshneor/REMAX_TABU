"use client";

import { ChevronDownIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Filter bar above a list: the common filters always show (`children`); the rest open under
 * "עוד סינונים" (`more`), whose button counts how many of them are on (`moreCount`).
 * `onReset` shows a reset button; `end` sits at the far end of the first row.
 */
export function FilterBar({
  children,
  more,
  moreCount,
  onReset,
  end,
  className,
}: {
  children: React.ReactNode;
  more: React.ReactNode;
  moreCount: number;
  onReset?: () => void;
  end?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border bg-card p-2.5 shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 outline-none pointer-coarse:h-11",
            moreCount > 0 && "border-primary text-primary",
          )}
        >
          <SlidersHorizontalIcon className="size-4" />
          עוד סינונים
          {moreCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{moreCount}</span>
          )}
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label="איפוס הסינון"
            title="איפוס הסינון"
            className="flex size-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 outline-none pointer-coarse:size-11"
          >
            <RotateCcwIcon className="size-4" />
          </button>
        )}
        {end && <div className="ms-auto">{end}</div>}
      </div>

      {open && <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t pt-2.5">{more}</div>}
    </div>
  );
}

/** On/off filter pill for the "עוד סינונים" row. */
export function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10 pointer-coarse:px-3.5 pointer-coarse:text-sm",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Thin divider between groups in the "עוד סינונים" row. */
export function FilterDivider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}
