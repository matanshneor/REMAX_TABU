"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Preset = "today" | "tomorrow" | "week";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "היום" },
  { key: "tomorrow", label: "מחר" },
  { key: "week", label: "בעוד שבוע" },
];

function at(daysFromToday: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** "Today" means 18:00 — or an hour from now if that's already passed. */
function presetDate(key: Preset): Date {
  if (key === "today") {
    const evening = at(0, 18);
    return evening > new Date() ? evening : new Date(Date.now() + 60 * 60 * 1000);
  }
  return key === "tomorrow" ? at(1, 9) : at(7, 9);
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Due-date picker for tasks: one-tap presets plus "other date".
 * Value is an ISO string or null (no due date). Tapping the active preset clears it.
 */
export function QuickDate({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const [active, setActive] = useState<Preset | "custom" | null>(null);
  // Parent cleared the value (e.g. after saving) → forget the highlighted preset,
  // but keep the custom date field open while the user is still picking a date.
  const current = value || active === "custom" ? active : null;

  function pick(key: Preset) {
    if (current === key) {
      setActive(null);
      onChange(null);
      return;
    }
    setActive(key);
    onChange(presetDate(key).toISOString());
  }

  const chip = (on: boolean) =>
    cn(
      "h-8 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors",
      on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="מועד">
      {PRESETS.map((p) => (
        <button key={p.key} type="button" className={chip(current === p.key)} aria-pressed={current === p.key} onClick={() => pick(p.key)}>
          {p.label}
        </button>
      ))}
      {current === "custom" ? (
        <Input
          type="datetime-local"
          autoFocus
          className="h-8 w-48"
          aria-label="תאריך ושעה"
          value={value ? toLocalInput(new Date(value)) : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      ) : (
        <button type="button" className={chip(false)} onClick={() => setActive("custom")}>
          תאריך אחר…
        </button>
      )}
    </div>
  );
}
