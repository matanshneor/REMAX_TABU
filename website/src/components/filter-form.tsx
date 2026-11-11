"use client";

import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { FEATURES, type Filters, filtersHref, priceText, SORTS, TYPE_GROUPS } from "@/lib/filters";
import { buttonClass, cn, PRESS } from "./ui";

const PRICES = [1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 5_000_000, 6_000_000, 8_000_000, 10_000_000];
const SIZES = [50, 60, 70, 80, 90, 100, 120, 140, 160, 200, 250, 300];
const FLOORS = Array.from({ length: 16 }, (_, i) => i);
const ROOMS = [2, 3, 4, 5, 6];

export type FilterOptions = { hoods: string[]; cities: string[]; types: string[] };

function Select({ name, label, value, children }: { name: string; label: string; value: string | number | null; children: ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label-caps block">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          name={name}
          defaultValue={value ?? ""}
          className="h-12 w-full cursor-pointer appearance-none border border-line-strong bg-panel pe-10 ps-4 text-ink transition-colors duration-(--dur-ui) hover:border-ink-3 focus:border-ink-2"
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * The search. Works as a plain form (GET to /) and, with JavaScript, keeps the address short
 * (only what was chosen), so the agent can send a search as a link.
 */
export function FilterForm({ filters: f, options, base = "/" }: { filters: Filters; options: FilterOptions; base?: string }) {
  const router = useRouter();
  const id = useId();
  // On phones the search starts folded behind one button (on wider screens it is always open).
  const [open, setOpen] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const n = (k: string) => (d.get(k) ? Number(d.get(k)) : null);
    const href = filtersHref({
      hood: String(d.get("hood") ?? ""),
      city: String(d.get("city") ?? ""),
      type: String(d.get("type") ?? ""),
      rooms: n("rooms"),
      pmin: n("pmin"),
      pmax: n("pmax"),
      fmin: n("fmin"),
      fmax: n("fmax"),
      smin: n("smin"),
      smax: n("smax"),
      features: d.getAll("f") as Filters["features"],
      sort: (String(d.get("sort") || "new") as Filters["sort"]),
    }, base);
    // Tagged "filter" so listing photos stay put while results change (they only travel to a listing's page).
    router.push(`${href}#results`, { scroll: false, transitionTypes: ["filter"] });
    // At once: a smooth scroll would still be moving while the results cross-fade.
    document.getElementById("results")?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  const moreCount = [f.pmin, f.fmin, f.fmax, f.smin, f.smax].filter((v) => v != null).length + f.features.length;
  // How many choices are in force, shown on the phone button.
  const activeCount = [f.type, f.hood, f.city, f.rooms, f.pmax].filter((v) => v != null && v !== "").length + moreCount + (f.sort !== "new" ? 1 : 0);

  return (
    <>
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className={buttonClass("outline", "w-full justify-between sm:hidden")}
    >
      <span className="inline-flex items-center gap-2.5">
        <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
        סינון ומיון{activeCount > 0 && ` (${activeCount})`}
      </span>
      <ChevronDownIcon className={cn("size-4 transition-transform duration-(--dur-ui) ease-out", open && "rotate-180")} aria-hidden="true" />
    </button>
    <form
      id={id}
      action={base}
      method="get"
      onSubmit={submit}
      role="search"
      aria-label="חיפוש נכסים"
      className={cn("border border-line bg-panel/50 p-5 sm:p-6", open ? "max-sm:rise max-sm:mt-3" : "max-sm:hidden")}
    >
      {/* Row one: the four choices and the order. Row two: more filters, and the button. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-5">
        <Select name="type" label="סוג נכס" value={f.type}>
          <option value="">הכל</option>
          {Object.entries(TYPE_GROUPS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
          {options.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select name="hood" label="שכונה" value={f.hood}>
          <option value="">כל השכונות</option>
          {options.hoods.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </Select>
        <Select name="rooms" label="חדרים" value={f.rooms}>
          <option value="">הכל</option>
          {ROOMS.map((r) => (
            <option key={r} value={r}>
              {r}+
            </option>
          ))}
        </Select>
        <Select name="pmax" label="מחיר עד" value={f.pmax}>
          <option value="">ללא הגבלה</option>
          {PRICES.map((p) => (
            <option key={p} value={p}>
              {priceText(p)}
            </option>
          ))}
        </Select>
        <div className="max-lg:col-span-2">
          <Select name="sort" label="מיון" value={f.sort}>
            {Object.entries(SORTS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="relative mt-4">
      <details className="group" open={moreCount > 0}>
        <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 text-ink-2 transition-colors duration-(--dur-ui) hover:text-ink [&::-webkit-details-marker]:hidden">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
          עוד סינונים{moreCount > 0 && ` (${moreCount})`}
          <ChevronDownIcon className="size-4 transition-transform duration-(--dur-ui) ease-out group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4">
          {options.cities.length > 1 && (
            <Select name="city" label="עיר" value={f.city}>
              <option value="">כל הערים</option>
              {options.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
          <Select name="pmin" label="מחיר מ-" value={f.pmin}>
            <option value="">ללא הגבלה</option>
            {PRICES.map((p) => (
              <option key={p} value={p}>
                {priceText(p)}
              </option>
            ))}
          </Select>
          <Select name="smin" label="גודל מ- (מ״ר)" value={f.smin}>
            <option value="">הכל</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} מ״ר
              </option>
            ))}
          </Select>
          <Select name="smax" label="גודל עד (מ״ר)" value={f.smax}>
            <option value="">הכל</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} מ״ר
              </option>
            ))}
          </Select>
          <Select name="fmin" label="מקומה" value={f.fmin}>
            <option value="">הכל</option>
            {FLOORS.map((x) => (
              <option key={x} value={x}>
                {x === 0 ? "קרקע" : x}
              </option>
            ))}
          </Select>
          <Select name="fmax" label="עד קומה" value={f.fmax}>
            <option value="">הכל</option>
            {FLOORS.map((x) => (
              <option key={x} value={x}>
                {x === 0 ? "קרקע" : x}
              </option>
            ))}
          </Select>
        </div>
        <fieldset className="mt-6">
          <legend className="label-caps">מאפיינים</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(FEATURES).map(([k, { label }]) => (
              <label
                key={k}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2.5 border border-line-strong px-4 text-ink-2 hover:border-ink-3",
                  PRESS,
                  "has-[:checked]:border-ink-2 has-[:checked]:bg-line has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                )}
              >
                <input type="checkbox" name="f" value={k} defaultChecked={f.features.includes(k as Filters["features"][number])} className="size-4 accent-red" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </details>
      {/* On a computer the button sits on the "more filters" line; the extra filters open under both. */}
      <button type="submit" className={buttonClass("red", "mt-4 w-full sm:w-auto sm:min-w-56 lg:absolute lg:end-0 lg:top-0 lg:mt-0")}>
        הצגת נכסים
      </button>
      </div>
    </form>
    </>
  );
}
