import { cn } from "@/lib/utils";

const full = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

/**
 * A shekel amount for display-font numbers (prices, totals).
 * The display face draws "₪" poorly, so the sign is set small in the body font.
 */
export function Money({
  value,
  compact,
  className,
  signed,
}: {
  value: number | null | undefined;
  /** 2.82 מ׳ / 850 אלף instead of the full number */
  compact?: boolean;
  className?: string;
  /** Show "+" for positive amounts and "−" for negative ones. */
  signed?: boolean;
}) {
  if (value == null) return <span className={className}>—</span>;
  const abs = Math.abs(value);
  let number: string;
  let unit = "";
  if (compact && abs >= 1_000_000) {
    number = String(Number((abs / 1_000_000).toFixed(2)));
    unit = "מ׳";
  } else if (compact && abs >= 1_000) {
    number = String(Math.round(abs / 1_000));
    unit = "אלף";
  } else {
    number = full.format(abs);
  }
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";

  return (
    <span className={cn("inline-flex items-baseline gap-[0.15em] whitespace-nowrap", className)}>
      <span dir="ltr" className="tabular-nums">
        {sign}
        {number}
      </span>
      {unit && <span className="font-sans text-[0.55em] font-semibold">{unit}</span>}
      <span className="font-sans text-[0.55em] font-semibold opacity-70">₪</span>
    </span>
  );
}
