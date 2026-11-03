"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, InboxIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { MEDIA_BUCKET } from "@/components/properties/property-images";
import { PropertyPanel } from "@/components/properties/property-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { FilterBar } from "@/components/crm/filter-bar";
import { CurrencyInput } from "@/components/form/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentName, useSaveRecord, useSignedUrls } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { DISMISS_REASONS, PROPERTY_TYPES } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { ListingPanel } from "./listing-panel";
import { HandledList, MarketGrid } from "./market-list";
import { isOpenListing as isOpen, seenListingsKey, useMarketListings, useSeenListings } from "./use-market";

/** Filters behind "עוד סינונים", like the sellers page. */
type PoolFilters = { city: string; neighborhood: string; type: string; priceMin: string; priceMax: string; roomsMin: string; sizeMin: string };
const NO_POOL_FILTERS: PoolFilters = { city: "", neighborhood: "", type: "", priceMin: "", priceMax: "", roomsMin: "", sizeMin: "" };

/** "entered" keeps the pool's order: newest in the pool first. */
type PoolSort = "entered" | "price_asc" | "price_desc" | "rooms";
const POOL_SORTERS: Record<Exclude<PoolSort, "entered">, (a: MarketListing, b: MarketListing) => number> = {
  price_asc: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  price_desc: (a, b) => (b.price ?? 0) - (a.price ?? 0),
  rooms: (a, b) => (b.rooms ?? 0) - (a.rooms ?? 0),
};

/** "אחר" in the reason filter: a reason typed in, not one of the list. */
const OTHER_REASON = "__other__";

/** A listing's details as a new seller's starting values. */
function sellerFromListing(l: MarketListing): Record<string, unknown> {
  return {
    property_type: l.property_type ?? "",
    city: l.city ?? "",
    neighborhood: l.neighborhood ?? "",
    street: l.street ?? "",
    rooms: l.rooms ?? "",
    size_sqm: l.size_sqm ?? "",
    floor: l.floor ?? "",
    current_price: l.price ?? "",
    owner_name: l.advertiser ?? "",
    owner_phone: l.phone ?? "",
    lead_source: l.source,
    // The owner wants the office's service: an agreement, not "still recruiting".
    engagement: "consent",
    description: l.url ? `פורסם ב${l.source}: ${l.url}` : "",
  };
}

/**
 * "מאגר יד2": private listings, as cards, for anyone to call, newest in the pool first. Those the
 * user hasn't opened yet ("חדשות") come first; those they opened follow in their own section.
 * In a listing's card, whoever called marks the outcome: "העבר למוכרים שלי" (it becomes their
 * seller) or "לא רלוונטי" (with a reason). Handled listings fold away under the cards.
 */
export function MarketView() {
  const { profile } = useAuth();
  const router = useRouter();
  const agentName = useAgentName();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [text, setText] = useState("");
  const [more, setMore] = useState(NO_POOL_FILTERS);
  const [sort, setSort] = useState<PoolSort>("entered");
  const setMoreFilter = <K extends keyof PoolFilters>(k: K, v: PoolFilters[K]) => setMore((m) => ({ ...m, [k]: v }));
  const moreCount = (Object.keys(NO_POOL_FILTERS) as (keyof PoolFilters)[]).filter((k) => more[k] !== NO_POOL_FILTERS[k]).length;
  const filtering = text !== "" || moreCount > 0;
  const [shown, setShown] = useState({ added: false, dismissed: false });
  // The listing being turned into a seller (opens the "new seller" card, filled in).
  const [toSeller, setToSeller] = useState<MarketListing | null>(null);
  const saveListing = useSaveRecord<MarketListing>("market_listings", { silent: true });
  const saveProperty = useSaveRecord("properties", { silent: true });

  const { data: listings = [], isLoading, error } = useMarketListings();

  const matches = useMemo(() => {
    const t = text.trim().toLowerCase();
    // Phones are saved as 055-212-3456; typed digits should still find them.
    const digits = t.replace(/\D/g, "");
    const num = (v: string) => (v === "" ? null : Number(v));
    const [pMin, pMax, rMin, sMin] = [num(more.priceMin), num(more.priceMax), num(more.roomsMin), num(more.sizeMin)];
    const has = (v: string | null, q: string) => !q || (v ?? "").toLowerCase().includes(q.trim().toLowerCase());
    const found = listings.filter(
      (l) =>
        (!t ||
          (digits.length >= 3 && !!l.phone?.replace(/\D/g, "").includes(digits)) ||
          [l.title, l.street, l.neighborhood, l.city, l.advertiser].some((s) => s?.toLowerCase().includes(t))) &&
        has(l.city, more.city) &&
        has(l.neighborhood, more.neighborhood) &&
        (!more.type || l.property_type === more.type) &&
        (pMin == null || (l.price ?? 0) >= pMin) &&
        (pMax == null || (l.price ?? Infinity) <= pMax) &&
        (rMin == null || (l.rooms ?? 0) >= rMin) &&
        (sMin == null || (l.size_sqm ?? 0) >= sMin),
    );
    return sort === "entered" ? found : [...found].sort(POOL_SORTERS[sort]);
  }, [listings, text, more, sort]);
  const open = useMemo(() => matches.filter(isOpen), [matches]);
  const added = matches.filter((l) => l.status === "added");
  const dismissed = matches.filter((l) => l.status === "not_interested");

  // Filters inside "לא רלוונטיים": why, who marked it, and when.
  const [dismissFilter, setDismissFilter] = useState({ reason: "", by: "", days: "" });
  const [now] = useState(() => Date.now());
  const isListedReason = (r: string | null) => !!r && DISMISS_REASONS.includes(r);
  const dismissedShown = dismissed.filter(
    (l) =>
      (!dismissFilter.reason ||
        (dismissFilter.reason === OTHER_REASON ? !isListedReason(l.dismissed_reason) : l.dismissed_reason === dismissFilter.reason)) &&
      (!dismissFilter.by || l.dismissed_by === dismissFilter.by) &&
      (!dismissFilter.days ||
        (!!l.dismissed_at && now - new Date(l.dismissed_at).getTime() <= Number(dismissFilter.days) * 86_400_000)),
  );
  const dismissers = [...new Set(dismissed.map((l) => l.dismissed_by).filter((id): id is string => !!id))];
  const filteringDismissed = !!(dismissFilter.reason || dismissFilter.by || dismissFilter.days);

  // Listings this user has opened; the rest are "חדשות" (until the views load, all show as one list).
  const qc = useQueryClient();
  const seenKey = seenListingsKey(profile?.id);
  const { data: seen = null } = useSeenListings();
  const fresh = seen ? open.filter((l) => !seen.has(l.id)) : open;
  const opened = seen ? open.filter((l) => seen.has(l.id)) : [];
  // Opening a listing (from a card or a link) marks it seen, once.
  useEffect(() => {
    if (!openId || !seen || seen.has(openId) || !listings.some((l) => l.id === openId)) return;
    qc.setQueryData(seenKey, new Set([...seen, openId]));
    createClient()
      .from("market_listing_views")
      .upsert({ listing_id: openId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
      .then(({ error }) => error && qc.invalidateQueries({ queryKey: seenKey }));
    // seenKey is derived from profile?.id, already a dependency through `seen`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, seen, listings]);

  const photoPaths = useMemo(() => open.flatMap((l) => l.image_paths.slice(0, 1)), [open]);
  const { data: photos = {} } = useSignedUrls(MEDIA_BUCKET, photoPaths);

  // Sellers are private to their agent: the link shows for whoever moved it (and the admin).
  const canOpenSeller = (l: MarketListing) => l.assigned_to === profile?.id || isAdmin(profile);

  const section = (
    key: keyof typeof shown,
    title: string,
    rows: MarketListing[],
    detail: (l: MarketListing) => React.ReactNode,
    /** Shown above the list when it's open; `listed` are the rows after them. */
    filters?: { bar: React.ReactNode; listed: MarketListing[] },
  ) =>
    rows.length > 0 && (
      <div>
        <button
          onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
          aria-expanded={shown[key]}
          className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", !shown[key] && "rotate-90 rtl:-rotate-90")} />
          {title}
          <span className="font-normal tabular-nums">{rows.length}</span>
        </button>
        {shown[key] && filters && <div className="mb-2 flex flex-wrap items-center gap-2">{filters.bar}</div>}
        {shown[key] &&
          (filters && filters.listed.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">אין מודעות שמתאימות לסינון.</p>
          ) : (
            <HandledList rows={filters?.listed ?? rows} detail={detail} onOpen={setOpenId} />
          ))}
      </div>
    );

  return (
    <>
      <PageHeader
        title="מאגר יד 2"
        // Same number as the menu: open listings this user hasn't opened yet.
        count={seen ? listings.filter((l) => isOpen(l) && !seen.has(l.id)).length : undefined}
        actions={
          <Button
            onClick={() => {
              setOpenId(null);
              setCreating(true);
            }}
          >
            <PlusIcon />
            הוסף מודעה
          </Button>
        }
      />

      {/* The same bar as the sellers and buyers pages: search, sort, and the rest under "עוד סינונים". */}
      <FilterBar
        className="border-0 bg-transparent p-0 shadow-none"
        moreCount={moreCount}
        onReset={
          filtering
            ? () => {
                setText("");
                setMore(NO_POOL_FILTERS);
              }
            : undefined
        }
        more={
          <>
            <Input value={more.city} onChange={(e) => setMoreFilter("city", e.target.value)} placeholder="כל הערים" aria-label="עיר" className="w-28" />
            <Input
              value={more.neighborhood}
              onChange={(e) => setMoreFilter("neighborhood", e.target.value)}
              placeholder="כל השכונות"
              aria-label="שכונה"
              className="w-28"
            />
            <NativeSelect value={more.type} onChange={(e) => setMoreFilter("type", e.target.value)} aria-label="סוג נכס" className="w-28">
              <option value="">כל הסוגים</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <div className="flex items-center gap-1">
              <CurrencyInput value={more.priceMin} onChange={(v) => setMoreFilter("priceMin", v)} placeholder="מחיר מ-" aria-label="מחיר מינימלי" className="w-24" />
              <span className="text-muted-foreground">–</span>
              <CurrencyInput value={more.priceMax} onChange={(v) => setMoreFilter("priceMax", v)} placeholder="עד" aria-label="מחיר מקסימלי" className="w-24" />
            </div>
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              חדרים מ-
              <Input type="number" min={0} step={0.5} value={more.roomsMin} onChange={(e) => setMoreFilter("roomsMin", e.target.value)} className="w-16" />
            </Label>
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              מ״ר מ-
              <Input type="number" min={0} step={10} value={more.sizeMin} onChange={(e) => setMoreFilter("sizeMin", e.target.value)} className="w-20" />
            </Label>
          </>
        }
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="חיפוש רחוב, שכונה, מפרסם או טלפון…"
            className="bg-card ps-9"
          />
        </div>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as PoolSort)} aria-label="מיון" className="w-48 bg-card">
          <option value="entered">מיון: נכנסו למאגר לאחרונה</option>
          <option value="price_asc">מיון: מחיר מהנמוך לגבוה</option>
          <option value="price_desc">מיון: מחיר מהגבוה לנמוך</option>
          <option value="rooms">מיון: מספר חדרים</option>
        </NativeSelect>
      </FilterBar>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : open.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={listings.length ? "אין מודעות פתוחות" : "המאגר עדיין ריק"}
          hint="מודעות חדשות מיד2 ייכנסו לכאן לבד. אפשר גם להוסיף מודעה ידנית."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {fresh.length > 0 ? (
            <section>
              {opened.length > 0 && <GridTitle title="מודעות חדשות" hint="עוד לא נפתחו" count={fresh.length} />}
              <MarketGrid rows={fresh} photos={photos} seen={seen} onOpen={setOpenId} />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              אין מודעות חדשות: כל המודעות במאגר כבר נפתחו.
            </p>
          )}
          {opened.length > 0 && (
            <section>
              <GridTitle title="מודעות שנפתחו" hint="עדיין לא הועברו למוכרים ולא סומנו לא רלוונטיות" count={opened.length} />
              <MarketGrid rows={opened} photos={photos} seen={seen} onOpen={setOpenId} />
            </section>
          )}
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-8 flex flex-col gap-3">
          {section("added", "הועברו למוכרים", added, (l) => (
            <>
              ע״י <b className="font-medium text-foreground">{agentName(l.assigned_to)}</b> · {formatDate(l.updated_at)}
            </>
          ))}
          {section(
            "dismissed",
            "לא רלוונטיים",
            dismissed,
            (l) => (
              <>
                {l.dismissed_reason} · סומן ע״י <b className="font-medium text-foreground">{agentName(l.dismissed_by)}</b>
                {l.dismissed_at && ` · ${formatDate(l.dismissed_at)}`}
              </>
            ),
            {
              listed: dismissedShown,
              bar: (
                <>
                  <NativeSelect
                    value={dismissFilter.reason}
                    onChange={(e) => setDismissFilter((f) => ({ ...f, reason: e.target.value }))}
                    aria-label="סיבה"
                    className="w-48"
                  >
                    <option value="">כל הסיבות</option>
                    {DISMISS_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r} ({dismissed.filter((l) => l.dismissed_reason === r).length})
                      </option>
                    ))}
                    <option value={OTHER_REASON}>אחר ({dismissed.filter((l) => !isListedReason(l.dismissed_reason)).length})</option>
                  </NativeSelect>
                  <NativeSelect
                    value={dismissFilter.by}
                    onChange={(e) => setDismissFilter((f) => ({ ...f, by: e.target.value }))}
                    aria-label="מי סימן"
                    className="w-40"
                  >
                    <option value="">כל הסוכנים</option>
                    {dismissers.map((id) => (
                      <option key={id} value={id}>
                        {agentName(id)} ({dismissed.filter((l) => l.dismissed_by === id).length})
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={dismissFilter.days}
                    onChange={(e) => setDismissFilter((f) => ({ ...f, days: e.target.value }))}
                    aria-label="מתי"
                    className="w-36"
                  >
                    <option value="">כל הזמן</option>
                    <option value="7">בשבוע האחרון</option>
                    <option value="30">בחודש האחרון</option>
                    <option value="90">ב-3 חודשים</option>
                  </NativeSelect>
                  {filteringDismissed && (
                    <>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {dismissedShown.length} מתוך {dismissed.length}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setDismissFilter({ reason: "", by: "", days: "" })}>
                        נקה סינון
                      </Button>
                    </>
                  )}
                </>
              ),
            },
          )}
        </div>
      )}

      <ListingPanel
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
        onAddToSellers={(l) => {
          setOpenId(null);
          setToSeller(l);
        }}
        canOpenSeller={canOpenSeller}
      />
      <PropertyPanel
        id={null}
        creating={!!toSeller}
        prefill={toSeller ? sellerFromListing(toSeller) : undefined}
        onClose={() => setToSeller(null)}
        onCreated={async (propertyId) => {
          const listing = toSeller!;
          setToSeller(null);
          // The listing's photos carry over to the seller (same bucket), first, next to any added in the card.
          if (listing.image_paths.length) {
            const { data } = await createClient().from("properties").select("image_paths").eq("id", propertyId).single();
            await saveProperty
              .mutateAsync({ id: propertyId, values: { image_paths: [...listing.image_paths, ...(data?.image_paths ?? [])] } })
              .catch(() => {});
          }
          // Mark the listing moved and linked; who moved it is kept (assigned_to). Then show the seller.
          saveListing.mutate(
            { id: listing.id, values: { status: "added", property_id: propertyId, assigned_to: profile?.id } },
            { onSettled: () => router.push(`/properties?open=${propertyId}`) },
          );
        }}
      />
    </>
  );
}

/** A section title over a grid of listings: "מודעות חדשות 12 · עוד לא נפתחו". */
function GridTitle({ title, hint, count }: { title: string; hint: string; count: number }) {
  return (
    <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
      {title}
      <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>
      <span className="text-xs font-normal text-muted-foreground">· {hint}</span>
    </h2>
  );
}
