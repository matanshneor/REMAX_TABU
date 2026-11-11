"use client";

import { PhoneIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DealDialog, type DealPrefill } from "@/components/deals/deal-dialog";
import { useAuth } from "@/components/auth-provider";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { LockBanner, Panel, SaveFooter } from "@/components/crm/panel";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { ListingMatches } from "@/components/matching/listing-matches";
import { PropertyMatches } from "@/components/matching/property-matches";
import { LinkedTasks } from "@/components/tasks/linked-tasks";
import { ReminderButton } from "@/components/tasks/reminder-button";
import { ViewingsList } from "@/components/viewings/viewings-list";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useDeleteRecord, useRecord, useRecruiterName, useSaveRecord, useTeam } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { canEditBuyer, isAdmin } from "@/lib/permissions";
import type { Buyer } from "@/lib/types";
import { usePanelParam } from "@/lib/use-panel-param";
import { ADMIN_CREATE_SECTIONS, BUYER_CARD_CONTACT, BUYER_CARD_TOP, BUYER_SECTIONS, NEW_BUYER } from "./buyer-fields";
import { BuyerNotes } from "./buyer-notes";
import { DuplicatePhoneWarning } from "./duplicate-phone-warning";

/**
 * The buyer's card. With `creating`, the same card starts empty and is saved once; it then stays
 * open as the new buyer's card. `onCreated` opens a buyer here: the new one, or an existing buyer
 * with the same phone picked from the duplicate warning.
 */
export function BuyerPanel({
  id,
  creating = false,
  onClose,
  onCreated,
  focusLog = false,
}: {
  id: string | null;
  creating?: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  /** Opened from "רישום שיחה" on the list: the cursor goes to the call log. */
  focusLog?: boolean;
}) {
  const { profile } = useAuth();
  const recruiterName = useRecruiterName();
  const { data: team = [] } = useTeam();
  const { data: buyer, isLoading } = useRecord<Buyer>("buyers", creating ? null : id);
  const admin = isAdmin(profile);
  const createSections = admin ? ADMIN_CREATE_SECTIONS : BUYER_SECTIONS;
  const form = useFormValues(
    creating ? createSections : BUYER_SECTIONS,
    creating ? NEW_BUYER : buyer,
    creating ? "new" : `${buyer?.id}:${buyer?.updated_at}`,
  );
  const save = useSaveRecord<Buyer>("buyers");
  const remove = useDeleteRecord("buyers");

  const [, setOpenId] = usePanelParam();
  const editable = buyer ? canEditBuyer(profile, buyer) : false;
  const [dealPrefill, setDealPrefill] = useState<DealPrefill | null>(null);
  // A call typed in the log but not saved yet: closing the card asks first, like form edits.
  const [noteDraft, setNoteDraft] = useState(false);

  if (creating) {
    return (
      <Panel
        dirty={form.dirty}
        open
        onClose={onClose}
        title="קונה חדש"
        subtitle="ממלאים את הפרטים ושומרים פעם אחת"
        footer={
          <>
            <Button
              onClick={() => {
                if (!form.validate()) return;
                // Whoever enters a buyer owns it (also the DB default); a chosen recruiter overrides it.
                save.mutate(
                  { values: { ...toPayload(createSections, form.values), owner_agent_id: profile?.id } },
                  { onSuccess: (row) => onCreated?.(row.id) },
                );
              }}
              disabled={save.isPending}
            >
              {save.isPending ? "שומר…" : "שמירה"}
            </Button>
          </>
        }
      >
        <EntityForm sections={createSections} values={form.values} onChange={form.set} idPrefix="new-buyer" />
        <div className="mt-4 empty:hidden">
          <DuplicatePhoneWarning phone={String(form.values.phone ?? "")} onOpen={(existing) => onCreated?.(existing)} />
        </div>
      </Panel>
    );
  }

  function saveChanges() {
    if (!buyer || !form.validate()) return;
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
      dirty={form.dirty || noteDraft}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !buyer}
      missing={!!id && !isLoading && !buyer}
      title={buyer?.full_name}
      subtitle={buyer && `עודכן ${formatRelative(buyer.updated_at)}`}
      badges={
        buyer && admin ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            סוכן מגייס (מטפל):
            <NativeSelect
              value={buyer.recruiter_id ?? ""}
              onChange={(e) => {
                const member = team.find((t) => t.id === e.target.value) ?? null;
                save.mutate(
                  { id: buyer.id, values: { recruiter_id: member?.id ?? null } },
                  {
                    onSuccess: () => {
                      if (!member || member.profile_id === profile?.id) return;
                      toast.success(
                        member.profile_id
                          ? `הקונה הועבר ל${member.full_name}, ונשלחה התראה`
                          : `${member.full_name} עוד לא נרשם. הקונה יעבור אליו אוטומטית כשיירשם`,
                      );
                    },
                  },
                );
              }}
              disabled={save.isPending}
              className="w-full sm:w-44"
              aria-label="סוכן מטפל"
            >
              <option value="">לא משויך</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.profile_id ? t.full_name : `${t.full_name} (עוד לא נרשם)`}
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
            <ReminderButton
              buyerId={buyer.id}
              defaultTitle={`לחזור ל${buyer.full_name.split(" ")[0]}`}
              label="צור משימה"
              heading={`משימה ל${buyer.full_name}`}
            />
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
              הקונה משויך ל<strong>{recruiterName(buyer.recruiter_id, buyer.owner_agent_id)}</strong>. רק הסוכן המטפל והמנהל יכולים לערוך את הפרטים.
            </LockBanner>
          )}
          {/* What the buyer wants, financing and notes; then contact details; then the call log. */}
          <EntityForm sections={BUYER_CARD_TOP} values={form.values} onChange={form.set} readOnly={!editable} idPrefix="buyer" />
          <div className="mt-6">
            <EntityForm sections={BUYER_CARD_CONTACT} values={form.values} onChange={form.set} readOnly={!editable} idPrefix="buyer" />
          </div>
          <div className="mt-6">
            <BuyerNotes key={buyer.id} buyerId={buyer.id} onDraftChange={setNoteDraft} focus={focusLog} />
          </div>
          {"phone" in form.changes && (
            <div className="mt-4">
              <DuplicatePhoneWarning phone={String(form.values.phone ?? "")} excludeId={buyer.id} onOpen={setOpenId} />
            </div>
          )}
          <LinkedTasks buyer={buyer} title="המשימות שלי על הקונה" />
          <PropertyMatches buyer={buyer} />
          <ListingMatches buyer={buyer} />
          <ViewingsList buyerId={buyer.id} />
          {admin && (
            <DealDialog open={!!dealPrefill} prefill={dealPrefill ?? undefined} onOpenChange={(o) => !o && setDealPrefill(null)} />
          )}
        </>
      )}
    </Panel>
  );
}
