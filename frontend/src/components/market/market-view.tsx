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
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentName, useSaveRecord, useSignedUrls } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { ListingPanel } from "./listing-panel";
import { HandledList, MarketGrid } from "./market-list";
import { isOpenListing as isOpen, seenListingsKey, useMarketListings, useSeenListings } from "./use-market";

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
  const [shown, setShown] = useState({ added: false, dismissed: false });
  // The listing being turned into a seller (opens the "new seller" card, filled in).
  const [toSeller, setToSeller] = useState<MarketListing | null>(null);
  const saveListing = useSaveRecord<MarketListing>("market_listings", { silent: true });
  const saveProperty = useSaveRecord("properties", { silent: true });

  const { data: listings = [], isLoading, error } = useMarketListings();

  const matches = useMemo(() => {
    const t = text.trim().toLowerCase();
    return listings.filter((l) => !t || [l.title, l.street, l.neighborhood, l.city, l.advertiser, l.phone].some((s) => s?.toLowerCase().includes(t)));
  }, [listings, text]);
  const open = useMemo(() => matches.filter(isOpen), [matches]);
  const added = matches.filter((l) => l.status === "added");
  const dismissed = matches.filter((l) => l.status === "not_interested");

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

  const section = (key: keyof typeof shown, title: string, rows: MarketListing[], detail: (l: MarketListing) => React.ReactNode) =>
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
        {shown[key] && <HandledList rows={rows} detail={detail} onOpen={setOpenId} />}
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

      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="חיפוש רחוב, שכונה, מפרסם או טלפון…" className="ps-9" />
      </div>

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
              {opened.length > 0 && <GridTitle title="חדשות" hint="עוד לא פתחת" count={fresh.length} />}
              <MarketGrid rows={fresh} photos={photos} seen={seen} onOpen={setOpenId} />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              אין מודעות חדשות: פתחת את כל המודעות במאגר.
            </p>
          )}
          {opened.length > 0 && (
            <section>
              <GridTitle title="מודעות שפתחת" hint="עדיין לא הועברו למוכרים ולא סומנו לא רלוונטיות" count={opened.length} />
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
          {section("dismissed", "לא רלוונטיים", dismissed, (l) => (
            <>
              {l.dismissed_reason} · סומן ע״י <b className="font-medium text-foreground">{agentName(l.dismissed_by)}</b>
              {l.dismissed_at && ` · ${formatDate(l.dismissed_at)}`}
            </>
          ))}
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

/** A section title over a grid of listings: "חדשות 12 · עוד לא פתחת". */
function GridTitle({ title, hint, count }: { title: string; hint: string; count: number }) {
  return (
    <h2 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
      {title}
      <span className="text-sm font-normal text-muted-foreground tabular-nums">{count}</span>
      <span className="text-xs font-normal text-muted-foreground">· {hint}</span>
    </h2>
  );
}
