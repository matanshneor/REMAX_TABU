"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareTextIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { PanelSection } from "@/components/crm/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useAgentName } from "@/lib/data";
import { formatDateTime, formatRelative } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { BuyerNote } from "@/lib/types";

/** Call log on a buyer: short dated entries, newest first. Anyone who sees the buyer can add one. */
export function BuyerNotes({ buyerId }: { buyerId: string }) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const qc = useQueryClient();
  const key = ["buyer_notes", buyerId];
  const [text, setText] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<BuyerNote[]> => {
      const { data, error } = await createClient()
        .from("buyer_notes")
        .select("*")
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await createClient().from("buyer_notes").insert({ buyer_id: buyerId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["buyer_notes"] });
      // The buyers table shows the last call.
      qc.invalidateQueries({ queryKey: ["buyers", "list"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("buyer_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer_notes"] });
      qc.invalidateQueries({ queryKey: ["buyers", "list"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit() {
    const body = text.trim();
    if (body && !add.isPending) add.mutate(body);
  }

  return (
    <PanelSection title={`יומן שיחות${notes.length ? ` (${notes.length})` : ""}`}>
      <div className="flex flex-col gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="מה היה בשיחה? למשל: דיבר עם הבנק, מחכה לאישור משכנתא עד סוף השבוע"
          rows={2}
          aria-label="רישום שיחה חדשה"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Ctrl+Enter לשמירה מהירה</span>
          <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>
            {add.isPending ? "שומר…" : "הוסף ליומן"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareTextIcon className="size-4" />
          עדיין לא נרשמו שיחות עם הקונה
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3 border-s-2 border-primary/15 ps-4">
          {notes.map((n) => {
            const canDelete = n.author_id === profile?.id || isAdmin(profile);
            return (
              <li key={n.id} className="group relative text-sm">
                <span aria-hidden className="absolute -start-[21px] top-1.5 size-2 rounded-full bg-primary/60 ring-4 ring-background" />
                <p className="text-xs text-muted-foreground">
                  <time dateTime={n.created_at} title={formatDateTime(n.created_at)}>
                    {formatRelative(n.created_at)}
                  </time>
                  {" · "}
                  {n.author_id === profile?.id ? "אני" : agentName(n.author_id)}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{n.body}</p>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(n.id)}
                    disabled={remove.isPending}
                    aria-label="מחק רישום"
                    title="מחק רישום"
                    className="absolute end-0 top-0 rounded p-1 text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </PanelSection>
  );
}
