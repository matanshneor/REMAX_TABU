import type { Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TONES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  orange: "bg-amber-50 text-amber-800 ring-amber-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  gray: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/15",
};

export function StatusBadge({
  map,
  value,
  className,
}: {
  map: Record<string, { label: string; tone: Tone }>;
  value: string;
  className?: string;
}) {
  const item = map[value] ?? { label: value, tone: "neutral" as Tone };
  return <Pill tone={item.tone} className={className}>{item.label}</Pill>;
}

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset ring-transparent [&_svg]:size-3",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
