"use client";

import { useQuery } from "@tanstack/react-query";
import { EyeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RelationSelect } from "@/components/form/relation-select";
import { PanelSection } from "@/components/crm/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgentName, useSaveRecord } from "@/lib/data";
import { formatDateTime, formatFullAddress } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

/** Viewing history (buyer ↔ property). Pass exactly one of buyerId / propertyId. */
export function ViewingsList({ buyerId, propertyId }: { buyerId?: string; propertyId?: string }) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const [adding, setAdding] = useState(false);
  const [other, setOther] = useState("");
  const [when, setWhen] = useState("");
  const [feedback, setFeedback] = useState("");
  const save = useSaveRecord("buyer_property_viewings");

  const { data = [], isLoading } = useQuery({
    queryKey: ["buyer_property_viewings", { buyerId, propertyId }],
    queryFn: async () => {
      let q = createClient()
        .from("buyer_property_viewings")
        .select("*, buyers(id, full_name), properties(id, street, house_number, apartment_number, city)")
        .order("viewed_at", { ascending: false });
      q = buyerId ? q.eq("buyer_id", buyerId) : q.eq("property_id", propertyId!);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!other) return;
    save.mutate(
      {
        values: {
          buyer_id: buyerId ?? other,
          property_id: propertyId ?? other,
          agent_id: profile?.id,
          viewed_at: when ? new Date(when).toISOString() : new Date().toISOString(),
          feedback: feedback.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setAdding(false);
          setOther("");
          setWhen("");
          setFeedback("");
        },
      },
    );
  }

  return (
    <PanelSection
      title={`היסטוריית צפיות${data.length ? ` (${data.length})` : ""}`}
      action={
        !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <PlusIcon />
            תיעוד צפייה
          </Button>
        )
      }
    >
      {adding && (
        <form onSubmit={submit} className="mb-4 grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="col-span-2">
            <RelationSelect kind={buyerId ? "property" : "buyer"} value={other} onChange={setOther} />
          </div>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="מועד הצפייה" />
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="משוב מהצפייה" />
          <div className="col-span-2 flex gap-2">
            <Button type="submit" size="sm" disabled={!other || save.isPending}>
              שמירת צפייה
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              ביטול
            </Button>
          </div>
        </form>
      )}

      {isLoading ? null : data.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <EyeIcon className="size-4" />
          עדיין לא תועדו צפיות
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {data.map((v) => (
            <li key={v.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                {buyerId && v.properties ? (
                  <Link href={`/properties?open=${v.properties.id}`} className="font-medium hover:underline">
                    {formatFullAddress(v.properties)}
                  </Link>
                ) : v.buyers ? (
                  <Link href={`/buyers?open=${v.buyers.id}`} className="font-medium hover:underline">
                    {v.buyers.full_name}
                  </Link>
                ) : null}
                {v.feedback && <p className="mt-0.5 text-muted-foreground">{v.feedback}</p>}
              </div>
              <div className="shrink-0 text-end text-xs text-muted-foreground">
                <p className="tabular-nums">{formatDateTime(v.viewed_at)}</p>
                <p>{agentName(v.agent_id)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}
