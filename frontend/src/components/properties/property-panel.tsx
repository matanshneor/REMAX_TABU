"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { LockBanner, Panel, SaveFooter } from "@/components/crm/panel";
import { StatusBadge } from "@/components/crm/status-badge";
import { BuyerMatches } from "@/components/matching/buyer-matches";
import { LinkedTasks } from "@/components/tasks/linked-tasks";
import { ReminderButton } from "@/components/tasks/reminder-button";
import { ViewingsList } from "@/components/viewings/viewings-list";
import { Button } from "@/components/ui/button";
import { errorMessage, useDeleteRecord, useRecord, useRecruiterName, useSaveRecord } from "@/lib/data";
import { formatAddress, formatILS } from "@/lib/format";
import { PROPERTY_ENGAGEMENT, PROPERTY_STATUS } from "@/lib/labels";
import { canEditProperty, canManageProperty, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types";
import { ExclusivityPill } from "./exclusivity-pill";
import { OwnerDetails } from "./owner-details";
import {
  MANAGER_ONLY_FIELDS,
  NEW_PROPERTY,
  PROPERTY_DESCRIPTION_SECTION,
  PROPERTY_SECTIONS,
  propertyCreateSections,
  withExclusivityLink,
  SELLER_CREATE_FIELDS,
  SELLER_CREATE_SECTION,
} from "./property-fields";
import { CreateAdButton } from "./create-ad-dialog";
import { PendingImages, PropertyImages, uploadPropertyImages } from "./property-images";
import { ShareWhatsAppButton } from "./share-whatsapp-dialog";

/** The description sits right under the photos; the other sections follow. */
const DETAIL_SECTIONS = PROPERTY_SECTIONS.filter((s) => s !== PROPERTY_DESCRIPTION_SECTION);

/** Owner details of a new seller go to their own table once the property exists. */
async function saveSeller(propertyId: string, payload: Record<string, unknown>) {
  const { owner_name, owner_phone, owner_notes } = payload as Record<string, string | null>;
  if (!owner_name && !owner_phone && !owner_notes) return;
  const { error } = await createClient()
    .from("property_owner_details")
    .insert({ property_id: propertyId, owner_name, owner_phone, notes: owner_notes });
  if (error) throw error;
}

/**
 * The seller's card. With `creating`, the same card starts empty: details, seller and photos are
 * filled in and saved once, and then it stays open as the new seller's card (`onCreated`).
 */
export function PropertyPanel({
  id,
  creating = false,
  prefill,
  onClose,
  onCreated,
}: {
  id: string | null;
  creating?: boolean;
  /** New seller only: values to start from (e.g. a listing from "מאגר יד2"). */
  prefill?: Record<string, unknown>;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { profile } = useAuth();
  const recruiterName = useRecruiterName();
  const { data: property, isLoading } = useRecord<Property>("properties", creating ? null : id);
  const createSections = propertyCreateSections(isAdmin(profile));
  const createForm = useMemo(() => [SELLER_CREATE_SECTION, ...createSections], [createSections]);
  const newValues = useMemo(() => ({ ...NEW_PROPERTY, ...prefill }), [prefill]);
  const form = useFormValues(
    creating ? createForm : PROPERTY_SECTIONS,
    creating ? newValues : property,
    creating ? `new:${JSON.stringify(prefill ?? {})}` : `${property?.id}:${property?.updated_at}`,
  );
  const setField = withExclusivityLink(form.set, form.values);
  const save = useSaveRecord<Property>("properties");
  const saveQuiet = useSaveRecord("properties", { silent: true });
  const remove = useDeleteRecord("properties");
  const [photos, setPhotos] = useState<File[]>([]);
  const [finishing, setFinishing] = useState(false);

  const editable = property ? canEditProperty(profile, property) : false;
  const manager = property ? canManageProperty(profile, property) : false;

  function create() {
    if (!form.validate()) return;
    const payload = toPayload(createForm, form.values);
    const values = Object.fromEntries(Object.entries(payload).filter(([k]) => !SELLER_CREATE_FIELDS.includes(k)));
    save.mutate(
      { values: { ...values, recruiting_agent_id: profile?.id } },
      {
        onSuccess: async (row) => {
          setFinishing(true);
          try {
            await saveSeller(row.id, payload);
            if (photos.length) {
              const { paths, failed } = await uploadPropertyImages(row.id, photos);
              if (paths.length) await saveQuiet.mutateAsync({ id: row.id, values: { image_paths: paths } });
              if (failed) toast.error(failed > 1 ? `${failed} תמונות לא הועלו — אפשר להוסיף אותן שוב` : "תמונה אחת לא הועלתה — אפשר להוסיף אותה שוב");
            }
          } catch (e) {
            toast.error(`המוכר נשמר, אבל חלק מהפרטים לא נשמרו: ${errorMessage(e)}`);
          } finally {
            setFinishing(false);
            setPhotos([]);
            onCreated?.(row.id);
          }
        },
      },
    );
  }

  if (creating) {
    const busy = save.isPending || finishing;
    const description = createSections.filter((s) => s === PROPERTY_DESCRIPTION_SECTION);
    const details = createSections.filter((s) => s !== PROPERTY_DESCRIPTION_SECTION);
    return (
      <Panel
        dirty={form.dirty || photos.length > 0}
        open
        onClose={onClose}
        title="מוכר חדש"
        subtitle="ממלאים את הפרטים ושומרים פעם אחת"
        footer={
          <>
            <Button onClick={create} disabled={busy}>
              {finishing ? "מעלה תמונות…" : busy ? "שומר…" : "שמור"}
            </Button>
          </>
        }
      >
        <EntityForm sections={[SELLER_CREATE_SECTION]} values={form.values} onChange={setField} idPrefix="new-property" />
        <div className="mt-6">
          <PendingImages files={photos} onChange={setPhotos} />
        </div>
        <EntityForm sections={description} values={form.values} onChange={setField} idPrefix="new-property" />
        <EntityForm sections={details} values={form.values} onChange={setField} idPrefix="new-property" />
      </Panel>
    );
  }

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !property}
      missing={!!id && !isLoading && !property}
      title={property && `${formatAddress(property)}`}
      subtitle={property && [property.neighborhood, property.city].filter(Boolean).join(", ")}
      badges={
        property && (
          <>
            <StatusBadge map={PROPERTY_STATUS} value={property.status} />
            {property.engagement !== "exclusive" && <StatusBadge map={PROPERTY_ENGAGEMENT} value={property.engagement} />}
            {property.is_exclusive && (
              <ExclusivityPill end={property.exclusivity_end} showDate />
            )}
            <span className="text-sm font-semibold tabular-nums">{formatILS(property.current_price)}</span>
            <span className="text-xs text-muted-foreground">גויס ע״י {recruiterName(property.recruiter_id, property.recruiting_agent_id)}</span>
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
            <CreateAdButton property={property} />
            <ReminderButton
              propertyId={property.id}
              defaultTitle={`מעקב: ${formatAddress(property)}`}
              label="צור משימה"
              heading={`משימה לנכס ב${formatAddress(property)}`}
            />
          </>
        )
      }
      footer={
        property && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            disabled={!editable}
            onSave={() => form.validate() && save.mutate({ id: property.id, values: form.changes })}
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
              הנכס בבלעדיות של <strong>{recruiterName(property.recruiter_id, property.recruiting_agent_id)}</strong>. רק הסוכן המגייס והמנהל יכולים לערוך אותו.
            </LockBanner>
          )}
          {/* Who to call comes first — it's what people open a property for. */}
          <OwnerDetails propertyId={property.id} editable={editable} first />
          <PropertyImages property={property} editable={editable} />
          <EntityForm
            sections={[PROPERTY_DESCRIPTION_SECTION]}
            values={form.values}
            onChange={setField}
            readOnly={!editable}
            idPrefix="property"
          />
          <EntityForm
            sections={DETAIL_SECTIONS}
            values={form.values}
            onChange={setField}
            readOnly={!editable}
            // Only the admin picks the recruiter; the recruiting agent still manages exclusivity.
            lockedFields={
              isAdmin(profile)
                ? ["previous_price"]
                : manager
                  ? ["previous_price", "recruiter_id"]
                  : ["previous_price", ...MANAGER_ONLY_FIELDS]
            }
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
