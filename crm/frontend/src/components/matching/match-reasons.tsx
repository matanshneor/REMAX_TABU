import { CheckIcon, MinusIcon } from "lucide-react";
import type { MatchReason } from "@/lib/matching";
import { cn } from "@/lib/utils";

export function MatchReasons({ reasons }: { reasons: MatchReason[] }) {
  if (!reasons.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reasons.map((r) => (
        <span
          key={r.label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px]",
            r.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {r.ok ? <CheckIcon className="size-3" /> : <MinusIcon className="size-3" />}
          {r.label}
        </span>
      ))}
    </div>
  );
}
