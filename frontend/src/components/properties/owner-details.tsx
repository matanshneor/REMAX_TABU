"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { PanelSection } from "@/components/crm/panel";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { OwnerDetails as OwnerRow } from "@/lib/types";
import { OWNER_SECTIONS } from "./property-fields";

/**
 * The seller (property owner). Every agent sees it; editing follows the property's rule
 * (anyone, unless the property is exclusive — then the recruiting agent and admin).
 */
export function OwnerDetails({ propertyId, editable, first }: { propertyId: string; editable: boolean; first?: boolean }) {
  const qc = useQueryClient();
  const key = ["property_owner_details", propertyId];

  const { data: row, isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<OwnerRow | null> => {
      const { data, error } = await createClient()
        .from("property_owner_details")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useFormValues(OWNER_SECTIONS, row, `${propertyId}:${row?.updated_at ?? "none"}`);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await createClient()
        .from("property_owner_details")
        .upsert({ property_id: propertyId, ...toPayload(OWNER_SECTIONS, form.values) });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property_owner_details"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success("פרטי המוכר נשמרו");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <PanelSection
      first={first}
      title="פרטי המוכר"
      action={row?.owner_phone && !form.dirty && <WhatsAppButton phone={row.owner_phone} label="וואטסאפ למוכר" />}
    >
      {!isLoading && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <EntityForm sections={OWNER_SECTIONS} values={form.values} onChange={form.set} readOnly={!editable} idPrefix="owner" />
          {form.dirty && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                שמור פרטי מוכר
              </Button>
              <Button size="sm" variant="ghost" onClick={form.reset}>
                בטל
              </Button>
            </div>
          )}
        </div>
      )}
    </PanelSection>
  );
}
