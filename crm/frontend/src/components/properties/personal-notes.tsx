"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { PanelSection } from "@/components/crm/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useAgentName } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

const notesKey = (propertyId: string) => ["property_personal_notes", propertyId];

/**
 * "הערות אישיות": the user's own notes on a seller. Only they see them, even on a seller shared
 * with the whole office, and they can write them whatever the seller's edit rule is. The manager
 * also sees every agent's notes, below his own.
 */
export function PersonalNotes({ propertyId, onDirtyChange }: { propertyId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const agentName = useAgentName();
  const key = notesKey(propertyId);

  // The manager's query returns everyone's notes (the database lets him); an agent's returns only their own.
  const { data: all, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("property_personal_notes")
        .select("user_id, notes, updated_at")
        .eq("property_id", propertyId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const mine = all?.find((n) => n.user_id === profile?.id);
  const others = isAdmin(profile) ? (all ?? []).filter((n) => n.user_id !== profile?.id) : [];

  return (
    <PanelSection title="הערות אישיות">
      {isLoading ? null : (
        <MyNote
          // Starts over when the saved note changes (after saving).
          key={`${propertyId}:${mine?.updated_at ?? "none"}`}
          saved={mine?.notes ?? ""}
          propertyId={propertyId}
          onSaved={() => qc.invalidateQueries({ queryKey: key })}
          onDirtyChange={onDirtyChange}
        />
      )}
      {others.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">הערות אישיות של סוכנים (רק המנהל רואה)</h4>
          <ul className="flex flex-col gap-2">
            {others.map((n) => (
              <li key={n.user_id} className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                <p className="mb-0.5 text-xs text-muted-foreground">
                  <b className="font-medium text-foreground">{agentName(n.user_id)}</b> · {formatDate(n.updated_at)}
                </p>
                <p className="whitespace-pre-wrap">{n.notes}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelSection>
  );
}

function MyNote({
  saved,
  propertyId,
  onSaved,
  onDirtyChange,
}: {
  saved: string;
  propertyId: string;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { profile } = useAuth();
  const [text, setText] = useState(saved);
  // Switching to another seller drops the unsaved text, so it no longer guards closing the card.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const dirty = text.trim() !== saved.trim();

  const save = useMutation({
    mutationFn: async () => {
      const table = createClient().from("property_personal_notes");
      const notes = text.trim();
      const { error } = notes
        ? await table.upsert({ property_id: propertyId, notes }, { onConflict: "user_id,property_id" })
        : await table.delete().eq("property_id", propertyId).eq("user_id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ההערה נשמרה");
      onDirtyChange?.(false);
      onSaved();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <Textarea
        id={`personal-notes-${propertyId}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onDirtyChange?.(e.target.value.trim() !== saved.trim());
        }}
        rows={4}
        aria-label="הערות אישיות"
        placeholder="הערות שלך על הנכס. רק אתה רואה אותן."
      />
      {dirty && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            שמירת ההערה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(saved);
              onDirtyChange?.(false);
            }}
          >
            ביטול
          </Button>
        </div>
      )}
    </div>
  );
}
