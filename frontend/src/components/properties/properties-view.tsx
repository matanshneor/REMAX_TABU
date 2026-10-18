"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CreateDialog } from "@/components/crm/create-dialog";
import { ExportButton } from "@/components/crm/export-button";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentName, useSignedUrls } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { PropertiesKpis } from "./properties-kpis";
import { PropertyCard } from "./property-card";
import { PROPERTY_CREATE_SECTIONS, SELLER_CREATE_FIELDS } from "./property-fields";
import { applyFilters, DEFAULT_FILTERS, PropertyFiltersPanel } from "./property-filters";
import { MEDIA_BUCKET } from "./property-images";
import { PropertyPanel } from "./property-panel";

/** Saves the seller typed into the "new seller" form, once the property row exists. */
async function saveSeller(property: Property, payload: Record<string, unknown>) {
  const { owner_name, owner_phone, owner_notes } = payload as Record<string, string | null>;
  if (!owner_name && !owner_phone && !owner_notes) return;
  const { error } = await createClient()
    .from("property_owner_details")
    .insert({ property_id: property.id, owner_name, owner_phone, notes: owner_notes });
  if (error) throw error;
}

type Sort = "updated" | "price_asc" | "price_desc" | "rooms";

const SORTERS: Record<Sort, (a: Property, b: Property) => number> = {
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  price_asc: (a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity),
  price_desc: (a, b) => (b.current_price ?? 0) - (a.current_price ?? 0),
  rooms: (a, b) => (b.rooms ?? 0) - (a.rooms ?? 0),
};

export function PropertiesView() {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>("updated");

  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ["properties", "list"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("properties")
        .select("*, property_owner_details(owner_name, owner_phone)");
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(
    () => applyFilters(properties, filters, profile?.id).sort(SORTERS[sort]),
    [properties, filters, profile?.id, sort],
  );
  const cities = useMemo(() => [...new Set(properties.map((p) => p.city))].sort(), [properties]);
  const coverPaths = useMemo(() => rows.flatMap((p) => p.image_paths.slice(0, 1)), [rows]);
  const { data: urls = {} } = useSignedUrls(MEDIA_BUCKET, coverPaths);

  return (
    <>
      <PageHeader
        title="מוכרים"
        description="כל הנכסים במאגר, כולל נכסים שאינם בבלעדיות המשרד"
        count={properties.length}
        actions={
          <>
            <ExportButton entity="properties" />
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              מוכר חדש
            </Button>
          </>
        }
      />

      {!isLoading && !error && <PropertiesKpis properties={properties} />}

      <div className="flex gap-6">
        <PropertyFiltersPanel value={filters} onChange={setFilters} cities={cities} />

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "טוען…" : `${rows.length} תואמים לסינון`}
            </p>
            <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44">
              <option value="updated">עודכנו לאחרונה</option>
              <option value="price_asc">מחיר: מהנמוך לגבוה</option>
              <option value="price_desc">מחיר: מהגבוה לנמוך</option>
              <option value="rooms">מספר חדרים</option>
            </NativeSelect>
          </div>

          {error ? (
            <ErrorState error={error} />
          ) : isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Building2Icon />}
              title={properties.length ? "אין מוכרים שמתאימים לסינון" : "עדיין אין מוכרים במאגר"}
              hint={properties.length ? "נסה להרחיב את הסינון." : "לחץ על ״מוכר חדש״ כדי להוסיף את הראשון."}
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4">
              {rows.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  imageUrl={p.image_paths[0] ? urls[p.image_paths[0]] : undefined}
                  agentName={agentName(p.recruiting_agent_id)}
                  sellerName={p.property_owner_details?.owner_name}
                  selected={openId === p.id}
                  onClick={() => setOpenId(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateDialog<Property>
        open={creating}
        onOpenChange={setCreating}
        title="מוכר חדש"
        table="properties"
        sections={PROPERTY_CREATE_SECTIONS}
        initial={{ status: "active", recruiting_agent_id: profile?.id, parking_spots: 0 }}
        omitFromInsert={SELLER_CREATE_FIELDS}
        afterInsert={saveSeller}
        onCreated={(p) => setOpenId(p.id)}
      />
      <PropertyPanel id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
