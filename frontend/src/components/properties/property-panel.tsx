"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { LockBanner, Panel, SaveFooter } from "@/components/crm/panel";
import { StatusBadge } from "@/components/crm/status-badge";
import { BuyerMatches } from "@/components/matching/buyer-matches";
import { LinkedTasks } from "@/components/tasks/linked-tasks";
import { ReminderButton } from "@/components/tasks/reminder-button";
import { ViewingsList } from "@/components/viewings/viewings-list";
import { Button } from "@/components/ui/button";
import { useAgentName, useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatAddress, formatILS } from "@/lib/format";
import { PROPERTY_STATUS } from "@/lib/labels";
import { canEditProperty, canManageProperty, isAdmin } from "@/lib/permissions";
import type { Property } from "@/lib/types";
import { ExclusivityPill } from "./exclusivity-pill";
import { OwnerDetails } from "./owner-details";
import { MANAGER_ONLY_FIELDS, PROPERTY_SECTIONS } from "./property-fields";
import { PropertyImages } from "./property-images";
import { ShareWhatsAppButton } from "./share-whatsapp-dialog";

export function PropertyPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const { data: property, isLoading } = useRecord<Property>("properties", id);
  const form = useFormValues(PROPERTY_SECTIONS, property, `${property?.id}:${property?.updated_at}`);
  const save = useSaveRecord("properties");
  const remove = useDeleteRecord("properties");

  const editable = property ? canEditProperty(profile, property) : false;
  const manager = property ? canManageProperty(profile, property) : false;

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !property}
      title={property && `${formatAddress(property)}`}
      subtitle={property && [property.neighborhood, property.city].filter(Boolean).join(", ")}
      badges={
        property && (
          <>
            <StatusBadge map={PROPERTY_STATUS} value={property.status} />
            {property.is_exclusive && (
              <ExclusivityPill end={property.exclusivity_end} showDate />
            )}
            <span className="text-sm font-semibold tabular-nums">{formatILS(property.current_price)}</span>
            <span className="text-xs text-muted-foreground">גויס ע״י {agentName(property.recruiting_agent_id)}</span>
          </>
        )
      }
      headerActions={
        property && (
          <>
            {property.virtual_tour_url && (
              <Button variant="outline" size="sm" render={<a href={property.virtual_tour_url} target="_blank" rel="noopener" />} nativeButton={false}>
                <ExternalLinkIcon />
                סיור וירטואלי
              </Button>
            )}
            <ShareWhatsAppButton property={property} />
            <ReminderButton propertyId={property.id} defaultTitle={`מעקב: ${formatAddress(property)}`} />
          </>
        )
      }
      footer={
        property && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            disabled={!editable}
            onSave={() => save.mutate({ id: property.id, values: form.changes })}
            onReset={form.reset}
            onDelete={isAdmin(profile) ? () => remove.mutate(property.id, { onSuccess: onClose }) : undefined}
          />
        )
      }
    >
      {property && (
        <>
          {!editable && (
            <LockBanner>
              הנכס בבלעדיות של <strong>{agentName(property.recruiting_agent_id)}</strong>. רק הסוכן המגייס והמנהל יכולים לערוך אותו.
            </LockBanner>
          )}
          {/* Who to call comes first — it's what people open a property for. */}
          <OwnerDetails propertyId={property.id} editable={editable} first />
          <PropertyImages property={property} editable={editable} />
          <EntityForm
            sections={PROPERTY_SECTIONS}
            values={form.values}
            onChange={form.set}
            readOnly={!editable}
            lockedFields={manager ? ["previous_price"] : ["previous_price", ...MANAGER_ONLY_FIELDS]}
            idPrefix="property"
          />
          <LinkedTasks propertyId={property.id} title="המשימות שלי על הנכס" />
          <BuyerMatches property={property} />
          <ViewingsList propertyId={property.id} />
        </>
      )}
    </Panel>
  );
}
