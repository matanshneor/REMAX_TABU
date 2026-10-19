"use client";

import { Building2Icon, LockIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/crm/kpi-card";
import type { Property } from "@/lib/types";

const SOON_DAYS = 14;

/** Two summary cards above the sellers grid. Exclusivity "ending soon" depends on today's date. */
export function PropertiesKpis({ properties }: { properties: Property[] }) {
  const active = properties.filter((p) => p.status === "active");
  const exclusive = active.filter((p) => p.is_exclusive);

  const { data: endingSoon = 0 } = useQuery({
    queryKey: ["properties", "kpi", "exclusivity-ending", exclusive.map((p) => `${p.id}:${p.exclusivity_end}`).join(",")],
    queryFn: () => {
      const limit = Date.now() + SOON_DAYS * 86_400_000;
      return exclusive.filter((p) => p.exclusivity_end && new Date(p.exclusivity_end).getTime() <= limit).length;
    },
  });

  return (
    <div className="mb-5 grid grid-cols-2 gap-4">
      <KpiCard
        label="מוכרים פעילים"
        value={active.length}
        note={`מתוך ${properties.length} במאגר`}
        icon={<Building2Icon />}
        progress={properties.length ? active.length / properties.length : 0}
      />
      <KpiCard
        tone="navy"
        label="בבלעדיות המשרד"
        value={exclusive.length}
        note={endingSoon ? `${endingSoon} מסתיימות בקרוב` : "אין סיומים קרובים"}
        noteTone={endingSoon ? "red" : "muted"}
        badge={<LockIcon className="size-5 text-primary/70" />}
        progress={active.length ? exclusive.length / active.length : 0}
      />
    </div>
  );
}
