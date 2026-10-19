import { LockIcon } from "lucide-react";
import { Pill } from "@/components/crm/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Days until the exclusivity ends (0 = today), or null when there's no end date. */
export function exclusivityDaysLeft(end: string | null | undefined): number | null {
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = end.slice(0, 10).split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

/**
 * Exclusivity is good news, so it's blue — not red. It turns orange only when it ends within
 * a week, and then says how many days are left.
 */
export function ExclusivityPill({ end, onImage, showDate }: { end: string | null; onImage?: boolean; showDate?: boolean }) {
  const days = exclusivityDaysLeft(end);
  const ending = days != null && days >= 0 && days <= 7;
  const label = ending
    ? days === 0
      ? "בלעדיות נגמרת היום"
      : days === 1
        ? "בלעדיות נגמרת מחר"
        : `בלעדיות נגמרת בעוד ${days} ימים`
    : showDate && end
      ? `בלעדיות עד ${formatDate(end)}`
      : "בלעדיות";
  return (
    <Pill
      tone={ending ? "orange" : "blue"}
      className={cn(onImage && (ending ? "bg-amber-500 text-white ring-0" : "bg-primary text-primary-foreground ring-0"))}
    >
      <LockIcon />
      {label}
    </Pill>
  );
}
