"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { errorMessage, useAgents, useCommissionRates } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/** Each agent's fixed commission percentage — pre-filled when recording a deal. */
export function AgentRates() {
  const { data: agents = [] } = useAgents();
  const { data: rates } = useCommissionRates();
  if (!rates) return null;
  return (
    <ul className="flex flex-col divide-y">
      {agents.map((a) => (
        <AgentRate key={`${a.id}:${rates.get(a.id)}`} agent={a} rate={rates.get(a.id) ?? 50} />
      ))}
    </ul>
  );
}

function AgentRate({ agent, rate }: { agent: Profile; rate: number }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(String(rate));

  async function save() {
    const pct = Number(value);
    if (pct === rate) return;
    if (!(pct > 0 && pct <= 100)) {
      toast.error("האחוז צריך להיות בין 1 ל-100");
      setValue(String(rate));
      return;
    }
    const { error } = await createClient().from("profiles").update({ commission_split: pct }).eq("id", agent.id);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["profiles"] });
    toast.success(`האחוז של ${agent.full_name} עודכן ל-${pct}%`);
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-medium">{agent.full_name || agent.email}</span>
      <div className="relative w-24">
        <Input
          type="number"
          min={1}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={`אחוז העמלה של ${agent.full_name}`}
          className="h-8 pe-6 text-end tabular-nums"
        />
        <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </li>
  );
}
