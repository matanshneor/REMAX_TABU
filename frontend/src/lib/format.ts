const ilsFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "numeric",
  year: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeFormatter = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

export function formatILS(amount: number | null | undefined): string {
  return amount == null ? "—" : ilsFormatter.format(amount);
}

/** Compact price for dense tables: "2.45 מ׳ ₪" / "850 אלף ₪" */
export function formatILSCompact(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_000_000) return `${Number((amount / 1_000_000).toFixed(2))} מ׳ ₪`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} אלף ₪`;
  return `${amount} ₪`;
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

export function formatRelative(value: string): string {
  const diffSec = (new Date(value).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return "עכשיו";
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), "hour");
  return relativeFormatter.format(Math.round(diffSec / 86400), "day");
}

export function formatAddress(p: {
  street?: string | null;
  house_number?: string | null;
  apartment_number?: string | null;
}): string {
  const base = [p.street, p.house_number].filter(Boolean).join(" ");
  return p.apartment_number ? `${base}, דירה ${p.apartment_number}` : base || "ללא כתובת";
}

/** Address with the city ("הרצל 12, דירה 5, ירושלים"); the city is optional. */
export function formatFullAddress(p: Parameters<typeof formatAddress>[0] & { city?: string | null }): string {
  return [formatAddress(p), p.city].filter(Boolean).join(", ");
}

/** yyyy-mm-dd in local time, for <input type="date"> */
export function toDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Old notifications carry raw ISO dates ("2026-10-24"). Show them the way the office reads
 * dates: "24.10.26 (בעוד 5 ימים)".
 */
export function humanizeDatesInText(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, y: string, m: string, d: string) => {
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    const when = days === 0 ? "היום" : days === 1 ? "מחר" : days > 1 ? `בעוד ${days} ימים` : days === -1 ? "אתמול" : `לפני ${-days} ימים`;
    return `${Number(d)}.${Number(m)}.${y.slice(2)} (${when})`;
  });
}
