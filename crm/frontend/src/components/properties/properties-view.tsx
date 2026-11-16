"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ExportButton } from "@/components/crm/export-button";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

type TabId = "official" | "mine" | "agents";
const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "official", label: "נכסים בבלעדיות המשרד", hint: "הנכסים הרשמיים של המשרד, שמופיעים לכל הסוכנים: שלך ושל סוכנים אחרים." },
  { id: "mine", label: "הנכסים שלי", hint: "הסקיצות שלך: נכסים שעוד לא שודרו. אפשר לכתוב עליהם מה שרוצים ולהוסיף נכסים חדשים. רק אתה והמנהל רואים אותם." },
  { id: "agents", label: "בגיוס אצל הסוכנים", hint: "הסקיצות של הסוכנים: נכסים שעוד לא שודרו. רק הסוכן ואתה רואים אותם." },
];

/** Broadcast sellers are the office's official ones; the rest are sketches, the user's own or (manager) an agent's. */
const tabOf = (p: Property, myId: string | undefined): TabId => (p.broadcast ? "official" : p.recruiting_agent_id === myId ? "mine" : "agents");

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
  // Tabs: the office's official sellers (shared with every agent), the user's own sketches (no
  // exclusivity yet, theirs alone) and, for the manager, the agents' sketches.
  const admin = isAdmin(profile);
  const myId = profile?.id;
  const [tab, setTab] = useState<TabId>("official");
  const byTab = useMemo(() => {
    const out: Record<TabId, typeof rows> = { official: [], mine: [], agents: [] };
    for (const p of rows) out[tabOf(p, myId)].push(p);
    return out;
  }, [rows, myId]);
  const tabs = TABS.filter((t) => admin || t.id !== "agents");
  // Opening a seller from a link (a bell notification, a copied listing) shows the tab it's in.
  const [syncedOpen, setSyncedOpen] = useState<string | null>(null);
  if (openId !== syncedOpen) {
    const p = openId ? properties.find((x) => x.id === openId) : undefined;
    if (!openId || p) {
      setSyncedOpen(openId);
      if (p) setTab(tabOf(p, myId));
    }
  }

  // A Yad2 listing copied by several agents (only the manager sees them all) shows as one card,
  // in the place of its first copy; a click asks whose copy to open.
  const cards = useMemo(() => {
    const list = byTab[tab];
    const copies = new Map<string, typeof rows>();
    for (const p of list) if (p.source_listing_id) copies.set(p.source_listing_id, [...(copies.get(p.source_listing_id) ?? []), p]);
    return list
      .filter((p) => !p.source_listing_id || copies.get(p.source_listing_id)![0] === p)
      .map((p) => ({ property: p, copies: p.source_listing_id ? copies.get(p.source_listing_id)! : [p] }));
  }, [byTab, tab]);
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

      <div role="tablist" aria-label="סוגי נכסים" className="-mb-2 flex flex-wrap gap-1.5 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-[3px] px-3.5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded-t-md",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className={cn("rounded-full border px-2 text-xs font-semibold tabular-nums", tab === t.id ? "border-transparent bg-primary/10" : "bg-card")}>
              {byTab[t.id].length}
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{TABS.find((t) => t.id === tab)?.hint}</p>

      <div>
        {error ? (
          <ErrorState error={error} />
        ) : isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon={<Building2Icon />}
            title={
              properties.length
                ? rows.length
                  ? "אין כאן נכסים"
                  : "אין מוכרים שמתאימים לסינון"
                : "עדיין אין מוכרים במאגר"
            }
            hint={
              rows.length && !filtering
                ? tab === "official"
                  ? "נכסים שהמנהל משדר לכולם יופיעו כאן."
                  : tab === "mine"
                    ? "לוחצים על ״מוכר חדש״ כדי להוסיף נכס."
                    : "נכסים שהסוכנים מגייסים ועוד לא שודרו יופיעו כאן."
                : properties.length
                  ? "אפשר להרחיב את הסינון, או לבדוק בלשוניות האחרות."
                  : "לוחצים על ״מוכר חדש״ כדי להוסיף את הראשון."
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {cards.map(({ property: p, copies }) => (
              <PropertyCard
                key={p.id}
                property={p}
                imageUrl={p.image_paths[0] ? urls[p.image_paths[0]] : undefined}
                mark={
                  // Who it belongs to, in the official and the agents' lists (in the user's own list it's all theirs).
                  tab === "mine"
                    ? undefined
                    : p.recruiting_agent_id === myId && copies.length === 1
                      ? { text: "נכס שלי", mine: true }
                      : {
                          text:
                            copies.length > 1
                              ? `${copies.length} סוכנים: ${copies.map((c) => recruiterName(c.recruiter_id, c.recruiting_agent_id)).join(", ")}`
                              : `גויס ע״י ${recruiterName(p.recruiter_id, p.recruiting_agent_id)}`,
                          mine: false,
                        }
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
