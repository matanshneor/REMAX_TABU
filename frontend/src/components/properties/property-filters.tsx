"use client";

import { FilterBar, FilterChip, FilterDivider } from "@/components/crm/filter-bar";
import { CurrencyInput } from "@/components/form/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { type Option, PROPERTY_ENGAGEMENT, PROPERTY_STATUS, PROPERTY_TYPES } from "@/lib/labels";
import type { Enum, Property } from "@/lib/types";

export type PropertyFilters = {
  city: string;
  neighborhood: string;
  type: string;
  source: string;
  engagement: Enum<"property_engagement"> | "";
  status: Enum<"property_status"> | "";
  priceMin: string;
  priceMax: string;
  roomsMin: string;
  sizeMin: string;
  safeRoom: boolean;
  balcony: boolean;
  garden: boolean;
  rentalUnit: boolean;
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
  source: "",
  engagement: "",
  status: "active",
  priceMin: "",
  priceMax: "",
  roomsMin: "",
  sizeMin: "",
  safeRoom: false,
  balcony: false,
  garden: false,
  rentalUnit: false,
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
      (!f.source || p.lead_source === f.source) &&
      (!f.engagement || p.engagement === f.engagement) &&
      (!f.status || p.status === f.status) &&
      (pMin == null || (p.current_price ?? 0) >= pMin) &&
      (pMax == null || (p.current_price ?? Infinity) <= pMax) &&
      (rMin == null || (p.rooms ?? 0) >= rMin) &&
      (sMin == null || (p.size_sqm ?? 0) >= sMin) &&
      (!f.safeRoom || p.has_safe_room) &&
      (!f.balcony || p.has_balcony) &&
      (!f.garden || p.has_garden) &&
      (!f.rentalUnit || p.has_rental_unit) &&
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
  ["rentalUnit", "יחידת דיור"],
  ["elevator", "מעלית"],
  ["parking", "חניה"],
  ["storage", "מחסן"],
  ["renovated", "משופץ"],
];

/**
 * The filters bar above the sellers: the page's search and sort in one row (`children`),
 * every filter behind "עוד סינונים" (its button counts those that are on).
 */
export function PropertyFiltersBar({
  value,
  onChange,
  cities,
  sources,
  onReset,
  children,
}: {
  value: PropertyFilters;
  onChange: (next: PropertyFilters) => void;
  cities: string[];
  /** Lead sources to filter by: the fixed list plus any typed-in ones. */
  sources: Option[];
  /** Clears the filters and the page's search; shown only when something is on. */
  onReset?: () => void;
  children: React.ReactNode;
}) {
  const set = <K extends keyof PropertyFilters>(k: K, v: PropertyFilters[K]) => onChange({ ...value, [k]: v });
  const chip = (k: keyof PropertyFilters, label: string) => (
    <FilterChip key={k} on={!!value[k]} onClick={() => set(k, !value[k])}>
      {label}
    </FilterChip>
  );

  return (
    <FilterBar
      className="border-0 bg-transparent p-0 shadow-none"
      moreCount={(Object.keys(DEFAULT_FILTERS) as (keyof PropertyFilters)[]).filter((k) => value[k] !== DEFAULT_FILTERS[k]).length}
      onReset={onReset}
      more={
        <>
          <NativeSelect
            value={value.status}
            onChange={(e) => set("status", e.target.value as PropertyFilters["status"])}
            aria-label="מצב בשוק"
            className="w-36"
          >
            <option value="">כל המצבים בשוק</option>
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
          <NativeSelect
            value={value.engagement}
            onChange={(e) => set("engagement", e.target.value as PropertyFilters["engagement"])}
            aria-label="סוג התקשרות"
            className="w-36"
          >
            <option value="">כל סוגי ההתקשרות</option>
            {Object.entries(PROPERTY_ENGAGEMENT).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={value.source} onChange={(e) => set("source", e.target.value)} aria-label="מקור" className="w-36">
            <option value="">כל המקורות</option>
            {sources.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            חדרים מ-
            <Input type="number" min={0} step={0.5} value={value.roomsMin} onChange={(e) => set("roomsMin", e.target.value)} className="w-16" />
          </Label>
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            מ״ר מ-
            <Input type="number" min={0} step={10} value={value.sizeMin} onChange={(e) => set("sizeMin", e.target.value)} className="w-20" />
          </Label>
          <FilterDivider />
          {TOGGLES.map(([k, label]) => chip(k, label))}
          <FilterDivider />
          {chip("exclusiveOnly", "בלעדיות בלבד")}
          {chip("mineOnly", "הנכסים שגייסתי")}
        </>
      }
    >
      {children}
    </FilterBar>
  );
}
