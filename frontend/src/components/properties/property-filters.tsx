"use client";

import { ChevronDownIcon, RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { CurrencyInput } from "@/components/form/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PROPERTY_STATUS, PROPERTY_TYPES } from "@/lib/labels";
import type { Enum, Property } from "@/lib/types";

export type PropertyFilters = {
  city: string;
  neighborhood: string;
  type: string;
  status: Enum<"property_status"> | "";
  priceMin: string;
  priceMax: string;
  roomsMin: string;
  sizeMin: string;
  safeRoom: boolean;
  balcony: boolean;
  garden: boolean;
  elevator: boolean;
  parking: boolean;
  storage: boolean;
  renovated: boolean;
  exclusiveOnly: boolean;
  mineOnly: boolean;
};

export const DEFAULT_FILTERS: PropertyFilters = {
  city: "",
  neighborhood: "",
  type: "",
  status: "active",
  priceMin: "",
  priceMax: "",
  roomsMin: "",
  sizeMin: "",
  safeRoom: false,
  balcony: false,
  garden: false,
  elevator: false,
  parking: false,
  storage: false,
  renovated: false,
  exclusiveOnly: false,
  mineOnly: false,
};

export function applyFilters<T extends Property>(list: T[], f: PropertyFilters, myId: string | undefined): T[] {
  const has = (v: string | null, q: string) => !q || (v ?? "").toLowerCase().includes(q.trim().toLowerCase());
  const num = (s: string) => (s === "" ? null : Number(s));
  const [pMin, pMax, rMin, sMin] = [num(f.priceMin), num(f.priceMax), num(f.roomsMin), num(f.sizeMin)];

  return list.filter(
    (p) =>
      has(p.city, f.city) &&
      has(p.neighborhood, f.neighborhood) &&
      (!f.type || p.property_type === f.type) &&
      (!f.status || p.status === f.status) &&
      (pMin == null || (p.current_price ?? 0) >= pMin) &&
      (pMax == null || (p.current_price ?? Infinity) <= pMax) &&
      (rMin == null || (p.rooms ?? 0) >= rMin) &&
      (sMin == null || (p.size_sqm ?? 0) >= sMin) &&
      (!f.safeRoom || p.has_safe_room) &&
      (!f.balcony || p.has_balcony) &&
      (!f.garden || p.has_garden) &&
      (!f.elevator || p.has_elevator) &&
      (!f.parking || p.parking_spots > 0) &&
      (!f.storage || p.has_storage) &&
      (!f.renovated || p.is_renovated) &&
      (!f.exclusiveOnly || p.is_exclusive) &&
      (!f.mineOnly || p.recruiting_agent_id === myId),
  );
}

const TOGGLES: [keyof PropertyFilters, string][] = [
  ["safeRoom", "ממ״ד"],
  ["balcony", "מרפסת"],
  ["garden", "גינה"],
  ["elevator", "מעלית"],
  ["parking", "חניה"],
  ["storage", "מחסן"],
  ["renovated", "משופץ"],
];

/** Persistent "Advanced Filters" sidebar. */
export function PropertyFiltersPanel({
  value,
  onChange,
  cities,
}: {
  value: PropertyFilters;
  onChange: (next: PropertyFilters) => void;
  cities: string[];
}) {
  const set = <K extends keyof PropertyFilters>(k: K, v: PropertyFilters[K]) => onChange({ ...value, [k]: v });
  const dirty = JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 self-start rounded-xl border bg-card p-4 lg:sticky lg:top-20 lg:w-64 shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">סינון מתקדם</h2>
        {dirty && (
          <button onClick={() => onChange(DEFAULT_FILTERS)} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <RotateCcwIcon className="size-3" />
            איפוס
          </button>
        )}
      </div>

      <Group label="סטטוס">
        <NativeSelect value={value.status} onChange={(e) => set("status", e.target.value as PropertyFilters["status"])}>
          <option value="">הכל</option>
          {Object.entries(PROPERTY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
      </Group>

      <Group label="עיר">
        <Input value={value.city} onChange={(e) => set("city", e.target.value)} list="filter-cities" placeholder="כל הערים" />
        <datalist id="filter-cities">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Group>

      <Group label="שכונה">
        <Input value={value.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="כל השכונות" />
      </Group>

      <Group label="סוג נכס">
        <NativeSelect value={value.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">הכל</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </Group>

      <Group label="מחיר">
        <div className="flex items-center gap-1.5">
          <CurrencyInput value={value.priceMin} onChange={(v) => set("priceMin", v)} placeholder="מ-" aria-label="מחיר מינימלי" />
          <span className="text-muted-foreground">–</span>
          <CurrencyInput value={value.priceMax} onChange={(v) => set("priceMax", v)} placeholder="עד" aria-label="מחיר מקסימלי" />
        </div>
      </Group>

      <div className="grid grid-cols-2 gap-2">
        <Group label="מינ׳ חדרים">
          <Input type="number" min={0} step={0.5} value={value.roomsMin} onChange={(e) => set("roomsMin", e.target.value)} />
        </Group>
        <Group label="מינ׳ מ״ר">
          <Input type="number" min={0} step={10} value={value.sizeMin} onChange={(e) => set("sizeMin", e.target.value)} />
        </Group>
      </div>

      <Group label="מאפיינים">
        <div className="flex flex-wrap gap-1.5">
          {TOGGLES.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => set(k, !value[k])}
              className={`h-7 rounded-full border px-2.5 text-xs font-medium transition-colors ${
                value[k] ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Group>

      <div className="flex flex-col gap-2.5 border-t pt-4">
        <ToggleRow label="בלעדיות בלבד" checked={value.exclusiveOnly} onChange={(c) => set("exclusiveOnly", c)} />
        <ToggleRow label="הנכסים שגייסתי" checked={value.mineOnly} onChange={(c) => set("mineOnly", c)} />
      </div>
    </aside>
  );
}

/** Filters that live behind "עוד סינונים" in the bar: shown on the button when any is on. */
const MORE_FILTERS: (keyof PropertyFilters)[] = ["roomsMin", "sizeMin", ...TOGGLES.map(([k]) => k), "exclusiveOnly", "mineOnly"];

/**
 * Desktop: the filters in a bar above the grid, so the listings use the full width.
 * The common ones are always shown; the rest open under "עוד סינונים".
 */
export function PropertyFiltersBar({
  value,
  onChange,
  cities,
}: {
  value: PropertyFilters;
  onChange: (next: PropertyFilters) => void;
  cities: string[];
}) {
  const [more, setMore] = useState(false);
  const set = <K extends keyof PropertyFilters>(k: K, v: PropertyFilters[K]) => onChange({ ...value, [k]: v });
  const dirty = JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTERS);
  const moreCount = MORE_FILTERS.filter((k) => value[k] !== DEFAULT_FILTERS[k]).length;

  const chip = (k: keyof PropertyFilters, label: string) => (
    <button
      key={k}
      type="button"
      onClick={() => set(k, !value[k])}
      aria-pressed={!!value[k]}
      className={cn(
        "h-8 rounded-full border px-2.5 text-xs font-medium transition-colors",
        value[k] ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-4 rounded-xl border bg-card p-2.5 shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)]">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          value={value.status}
          onChange={(e) => set("status", e.target.value as PropertyFilters["status"])}
          aria-label="סטטוס"
          className="w-28"
        >
          <option value="">כל הסטטוסים</option>
          {Object.entries(PROPERTY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
        <Input value={value.city} onChange={(e) => set("city", e.target.value)} list="bar-cities" placeholder="כל הערים" aria-label="עיר" className="w-28" />
        <datalist id="bar-cities">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Input value={value.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="כל השכונות" aria-label="שכונה" className="w-28" />
        <NativeSelect value={value.type} onChange={(e) => set("type", e.target.value)} aria-label="סוג נכס" className="w-28">
          <option value="">כל הסוגים</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-1">
          <CurrencyInput value={value.priceMin} onChange={(v) => set("priceMin", v)} placeholder="מחיר מ-" aria-label="מחיר מינימלי" className="w-24" />
          <span className="text-muted-foreground">–</span>
          <CurrencyInput value={value.priceMax} onChange={(v) => set("priceMax", v)} placeholder="עד" aria-label="מחיר מקסימלי" className="w-24" />
        </div>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-secondary",
            moreCount > 0 && "border-primary text-primary",
          )}
        >
          <SlidersHorizontalIcon className="size-4" />
          עוד סינונים
          {moreCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{moreCount}</span>
          )}
          <ChevronDownIcon className={cn("size-4 transition-transform", more && "rotate-180")} />
        </button>
        {dirty && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            aria-label="איפוס הסינון"
            title="איפוס הסינון"
            className="flex size-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-secondary"
          >
            <RotateCcwIcon className="size-4" />
          </button>
        )}
      </div>

      {more && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t pt-2.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            חדרים מ-
            <Input type="number" min={0} step={0.5} value={value.roomsMin} onChange={(e) => set("roomsMin", e.target.value)} className="h-8 w-16" />
          </Label>
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            מ״ר מ-
            <Input type="number" min={0} step={10} value={value.sizeMin} onChange={(e) => set("sizeMin", e.target.value)} className="h-8 w-20" />
          </Label>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          {TOGGLES.map(([k, label]) => chip(k, label))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          {chip("exclusiveOnly", "בלעדיות בלבד")}
          {chip("mineOnly", "הנכסים שגייסתי")}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
