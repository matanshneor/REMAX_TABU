"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ExportButton } from "@/components/crm/export-button";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecruiterName, useSignedUrls } from "@/lib/data";
import { formatAddress, formatDate } from "@/lib/format";
import { PROPERTY_ENGAGEMENT, sourceOptions } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { PropertyCard } from "./property-card";
import { applyFilters, DEFAULT_FILTERS, PropertyFiltersBar } from "./property-filters";
import { MEDIA_BUCKET } from "./property-images";
import { PropertyPanel } from "./property-panel";


/** Saves the seller typed into the "new seller" form, once the property row exists. */
type Sort = "updated" | "price_asc" | "price_desc" | "rooms";

const SORTERS: Record<Sort, (a: Property, b: Property) => number> = {
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  price_asc: (a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity),
  price_desc: (a, b) => (b.current_price ?? 0) - (a.current_price ?? 0),
  rooms: (a, b) => (b.rooms ?? 0) - (a.rooms ?? 0),
};

export function PropertiesView() {
  const { profile } = useAuth();
  const recruiterName = useRecruiterName();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>("updated");
  const [text, setText] = useState("");
  const filtering = text !== "" || JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

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

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    // Phones are saved as 052-123-4567; typed digits should still find them.
    const digits = t.replace(/\D/g, "");
    const found = (p: (typeof properties)[number]) =>
      !t ||
      (digits.length >= 3 && !!p.property_owner_details?.owner_phone?.replace(/\D/g, "").includes(digits)) ||
      [[p.street, p.house_number].filter(Boolean).join(" "), p.neighborhood, p.city, p.property_owner_details?.owner_name]
        .some((s) => s?.toLowerCase().includes(t));
    return applyFilters(properties, filters, profile?.id).filter(found).sort(SORTERS[sort]);
  }, [properties, filters, profile?.id, sort, text]);
  const cities = useMemo(
    () => [...new Set(properties.map((p) => p.city).filter((c): c is string => !!c))].sort(),
    [properties],
  );
  const sources = useMemo(() => sourceOptions(properties.map((p) => p.lead_source)), [properties]);
  // A Yad2 listing copied by several agents (only the manager sees them all) shows as one card,
  // in the place of its first copy; a click asks whose copy to open.
  const cards = useMemo(() => {
    const copies = new Map<string, typeof rows>();
    for (const p of rows) if (p.source_listing_id) copies.set(p.source_listing_id, [...(copies.get(p.source_listing_id) ?? []), p]);
    return rows
      .filter((p) => !p.source_listing_id || copies.get(p.source_listing_id)![0] === p)
      .map((p) => ({ property: p, copies: p.source_listing_id ? copies.get(p.source_listing_id)! : [p] }));
  }, [rows]);
  const [picking, setPicking] = useState<typeof rows | null>(null);
  const coverPaths = useMemo(() => rows.flatMap((p) => p.image_paths.slice(0, 1)), [rows]);
  const { data: urls = {} } = useSignedUrls(MEDIA_BUCKET, coverPaths);

  return (
    <>
      <PageHeader
        title={isAdmin(profile) ? "מוכרים" : "המוכרים שלי"}
        // Same number as the sidebar: listings that are on the market now.
        count={properties.filter((p) => p.status === "active").length}
        actions={
          <>
            <ExportButton entity="properties" />
            <Button
              onClick={() => {
                setOpenId(null);
                setCreating(true);
              }}
            >
              <PlusIcon />
              מוכר חדש
            </Button>
          </>
        }
      />

      <PropertyFiltersBar
        value={filters}
        onChange={setFilters}
        cities={cities}
        sources={sources}
        onReset={
          filtering
            ? () => {
                setText("");
                setFilters(DEFAULT_FILTERS);
              }
            : undefined
        }
      >
        <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="חיפוש כתובת, שכונה, שם המוכר או טלפון…"
            className="bg-card ps-9"
          />
        </div>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="מיון" className="min-w-0 flex-1 bg-card sm:w-48 sm:flex-none">
          <option value="updated">מיון: עודכנו לאחרונה</option>
          <option value="price_asc">מיון: מחיר מהנמוך לגבוה</option>
          <option value="price_desc">מיון: מחיר מהגבוה לנמוך</option>
          <option value="rooms">מיון: מספר חדרים</option>
        </NativeSelect>
      </PropertyFiltersBar>

      <div>
        {error ? (
          <ErrorState error={error} />
        ) : isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Building2Icon />}
            title={properties.length ? "אין מוכרים שמתאימים לסינון" : "עדיין אין מוכרים במאגר"}
            hint={properties.length ? "אפשר להרחיב את הסינון." : "לוחצים על ״מוכר חדש״ כדי להוסיף את הראשון."}
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {cards.map(({ property: p, copies }) => (
              <PropertyCard
                key={p.id}
                property={p}
                imageUrl={p.image_paths[0] ? urls[p.image_paths[0]] : undefined}
                agentName={recruiterName(p.recruiter_id, p.recruiting_agent_id)}
                agentLine={
                  copies.length > 1
                    ? `${copies.length} סוכנים: ${copies.map((c) => recruiterName(c.recruiter_id, c.recruiting_agent_id)).join(", ")}`
                    : undefined
                }
                sellerName={p.property_owner_details?.owner_name}
                sellerPhone={p.property_owner_details?.owner_phone}
                selected={copies.some((c) => c.id === openId)}
                onClick={() => (copies.length > 1 ? setPicking(copies) : setOpenId(p.id))}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!picking} onOpenChange={(o) => !o && setPicking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal">{picking && formatAddress(picking[0])}</DialogTitle>
            <DialogDescription>כמה סוכנים העתיקו את המודעה הזו מיד 2. לכל אחד יש כרטיס משלו, עם ההערות והמשימות שלו.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y overflow-hidden rounded-xl border text-sm">
            {picking?.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicking(null);
                    setOpenId(c.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{recruiterName(c.recruiter_id, c.recruiting_agent_id)}</span>
                  <StatusBadge map={PROPERTY_ENGAGEMENT} value={c.engagement} />
                  <span className="text-xs text-muted-foreground">עודכן {formatDate(c.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <PropertyPanel
        id={openId}
        creating={creating}
        onClose={() => {
          setCreating(false);
          setOpenId(null);
        }}
        onCreated={(id) => {
          setCreating(false);
          setOpenId(id);
        }}
      />
    </>
  );
}
