"use client";

import { PhoneIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DealDialog, type DealPrefill } from "@/components/deals/deal-dialog";
import { useAuth } from "@/components/auth-provider";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { LockBanner, Panel, SaveFooter } from "@/components/crm/panel";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { PropertyMatches } from "@/components/matching/property-matches";
import { LinkedTasks } from "@/components/tasks/linked-tasks";
import { ReminderButton } from "@/components/tasks/reminder-button";
import { ViewingsList } from "@/components/viewings/viewings-list";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useAgentName, useAgents, useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { canEditBuyer, isAdmin } from "@/lib/permissions";
import type { Buyer } from "@/lib/types";
import { usePanelParam } from "@/lib/use-panel-param";
import { BUYER_SECTIONS } from "./buyer-fields";
import { BuyerNotes } from "./buyer-notes";
import { DuplicatePhoneWarning } from "./duplicate-phone-warning";

export function BuyerPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const { data: agents = [] } = useAgents();
  const { data: buyer, isLoading } = useRecord<Buyer>("buyers", id);
  const form = useFormValues(BUYER_SECTIONS, buyer, `${buyer?.id}:${buyer?.updated_at}`);
  const save = useSaveRecord("buyers");
  const remove = useDeleteRecord("buyers");

  const [, setOpenId] = usePanelParam();
  const editable = buyer ? canEditBuyer(profile, buyer) : false;
  const admin = isAdmin(profile);
  const [dealPrefill, setDealPrefill] = useState<DealPrefill | null>(null);

  function saveChanges() {
    if (!buyer) return;
    const justBought = form.changes.status === "bought_with_us" && buyer.status !== "bought_with_us";
    save.mutate(
      { id: buyer.id, values: form.changes },
      {
        onSuccess: () => {
          if (!justBought) return;
          // A purchase through the office is a deal: offer to record it right away.
          if (admin) setDealPrefill({ buyer_id: buyer.id, agent_id: buyer.owner_agent_id ?? undefined });
          else toast.success("מעולה! מנהל המשרד קיבל התראה לרשום את העסקה.", { duration: 8000 });
        },
      },
    );
  }

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !buyer}
      title={buyer?.full_name}
      subtitle={buyer && `עודכן ${formatRelative(buyer.updated_at)}`}
      badges={
        buyer && admin ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            סוכן מטפל:
            <NativeSelect
              value={buyer.owner_agent_id ?? ""}
              onChange={(e) => {
                const owner = e.target.value || null;
                save.mutate(
                  { id: buyer.id, values: { owner_agent_id: owner } },
                  { onSuccess: () => owner && owner !== profile?.id && toast.success(`הקונה הועבר ל${agentName(owner)}, ונשלחה התראה`) },
                );
              }}
              disabled={save.isPending}
              className="w-44"
              aria-label="סוכן מטפל"
            >
              <option value="">לא משויך</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : undefined
      }
      headerActions={
        buyer && (
          <>
            {buyer.phone && (
              <Button variant="outline" size="sm" render={<a href={`tel:${buyer.phone}`} />} nativeButton={false}>
                <PhoneIcon />
                חייג
              </Button>
            )}
            <WhatsAppButton phone={buyer.phone} />
            <ReminderButton buyerId={buyer.id} defaultTitle={`לחזור ל${buyer.full_name.split(" ")[0]}`} />
          </>
        )
      }
      footer={
        buyer && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            disabled={!editable}
            onSave={saveChanges}
            onReset={form.reset}
            onDelete={admin ? () => remove.mutate(buyer.id, { onSuccess: onClose }) : undefined}
          />
        )
      }
    >
      {buyer && (
        <>
          {!editable && (
            <LockBanner>
              הקונה משויך ל<strong>{agentName(buyer.owner_agent_id)}</strong>. רק הסוכן המטפל והמנהל יכולים לערוך את הפרטים.
            </LockBanner>
          )}
          <EntityForm
            sections={BUYER_SECTIONS}
            values={form.values}
            onChange={form.set}
            readOnly={!editable}
            idPrefix="buyer"
          />
          {"phone" in form.changes && (
            <div className="mt-4">
              <DuplicatePhoneWarning phone={String(form.values.phone ?? "")} excludeId={buyer.id} onOpen={setOpenId} />
            </div>
          )}
          <BuyerNotes buyerId={buyer.id} />
          <LinkedTasks buyerId={buyer.id} title="המשימות שלי על הקונה" />
          <PropertyMatches buyer={buyer} />
          <ViewingsList buyerId={buyer.id} />
          {admin && (
            <DealDialog open={!!dealPrefill} prefill={dealPrefill ?? undefined} onOpenChange={(o) => !o && setDealPrefill(null)} />
          )}
        </>
      )}
    </Panel>
  );
}
