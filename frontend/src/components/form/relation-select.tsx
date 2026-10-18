"use client";

import { useQuery } from "@tanstack/react-query";
import { NativeSelect } from "@/components/ui/native-select";
import { useAgents } from "@/lib/data";
import { formatAddress } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Kind = "agent" | "buyer" | "property";

function useRelationOptions(kind: Kind) {
  const agents = useAgents();
  const others = useQuery({
    queryKey: [kind === "buyer" ? "buyers" : "properties", "options"],
    enabled: kind !== "agent",
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      if (kind === "buyer") {
        const { data, error } = await supabase.from("buyers").select("id, full_name, phone").order("full_name");
        if (error) throw error;
        return data.map((b) => ({ value: b.id, label: b.phone ? `${b.full_name} · ${b.phone}` : b.full_name }));
      }
      const { data, error } = await supabase
        .from("properties")
        .select("id, street, house_number, apartment_number, city")
        .order("city");
      if (error) throw error;
      return data.map((p) => ({ value: p.id, label: `${formatAddress(p)}, ${p.city}` }));
    },
  });

  if (kind === "agent") return (agents.data ?? []).map((a) => ({ value: a.id, label: a.full_name || a.email }));
  return others.data ?? [];
}

export function RelationSelect({
  kind,
  value,
  onChange,
  disabled,
  id,
}: {
  kind: Kind;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const options = useRelationOptions(kind);
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">— ללא —</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
