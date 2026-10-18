"use client";

import { ArrowDownIcon, Building2Icon, LockIcon, TagIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { KpiBadge, KpiCard } from "@/components/crm/kpi-card";
import { Money } from "@/components/crm/money";
import type { Property } from "@/lib/types";

const SOON_DAYS = 14;

/** Four summary cards above the sellers grid. Exclusivity "ending soon" depends on today's date. */
export function PropertiesKpis({ properties }: { properties: Property[] }) {
  const active = properties.filter((p) => p.status === "active");
  const exclusive = active.filter((p) => p.is_exclusive);
  const dropped = active.filter((p) => p.previous_price != null && p.current_price != null && p.current_price < p.previous_price);
  const priced = active.filter((p) => p.current_price != null);
  const avg = priced.length ? priced.reduce((s, p) => s + p.current_price!, 0) / priced.length : null;

  const { data: endingSoon = 0 } = useQuery({
    queryKey: ["properties", "kpi", "exclusivity-ending", exclusive.map((p) => `${p.id}:${p.exclusivity_end}`).join(",")],
    queryFn: () => {
      const limit = Date.now() + SOON_DAYS * 86_400_000;
      return exclusive.filter((p) => p.exclusivity_end && new Date(p.exclusivity_end).getTime() <= limit).length;
    },
  });

  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="מוכרים פעילים"
        value={active.length}
        note={`מתוך ${properties.length} במאגר`}
        icon={<Building2Icon />}
        progress={properties.length ? active.length / properties.length : 0}
      />
      <KpiCard
        tone="red"
        label="בבלעדיות המשרד"
        value={exclusive.length}
        note={endingSoon ? `${endingSoon} מסתיימות בקרוב` : "אין סיומים קרובים"}
        noteTone={endingSoon ? "red" : "muted"}
        badge={<LockIcon className="size-5 text-brand-red/70" />}
        progress={active.length ? exclusive.length / active.length : 0}
      />
      <KpiCard
        label="ירידות מחיר"
        value={dropped.length}
        note="הזדמנויות לקונים"
        badge={
          dropped.length ? (
            <KpiBadge tone="green">
              <ArrowDownIcon className="size-3.5" />
              מחיר
            </KpiBadge>
          ) : undefined
        }
        progress={active.length ? dropped.length / active.length : 0}
      />
      <KpiCard tone="navy" label="מחיר ממוצע" value={<Money value={avg} compact />} note="לנכס פעיל" icon={<TagIcon />} />
    </div>
  );
}
