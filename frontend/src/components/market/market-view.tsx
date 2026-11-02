"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, InboxIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

/** Still to call ("contacted" is from before the two outcomes; it stays open). */
const isOpen = (l: MarketListing) => l.status === "new" || l.status === "contacted";

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
 * "מאגר יד2": new private listings, as cards, for anyone to call. In a listing's card, whoever
 * called marks the outcome: "העבר למוכרים שלי" (it becomes their seller) or "לא רלוונטי" (with
 * a reason). Handled listings fold away under the cards.
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

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["market_listings", "list"],
    queryFn: async () => {
      const { data, error } = await createClient().from("market_listings").select("*").order("listed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const matches = useMemo(() => {
    const t = text.trim().toLowerCase();
    return listings.filter((l) => !t || [l.title, l.street, l.neighborhood, l.city, l.advertiser, l.phone].some((s) => s?.toLowerCase().includes(t)));
  }, [listings, text]);
  const fresh = matches.filter(isOpen);
  const added = matches.filter((l) => l.status === "added");
  const dismissed = matches.filter((l) => l.status === "not_interested");

  const photoPaths = useMemo(() => fresh.flatMap((l) => (l.image_path ? [l.image_path] : [])), [fresh]);
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
        count={listings.filter(isOpen).length}
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
      ) : fresh.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={listings.length ? "אין מודעות חדשות" : "המאגר עדיין ריק"}
          hint="מודעות חדשות מיד2 ייכנסו לכאן לבד. אפשר גם להוסיף מודעה ידנית."
        />
      ) : (
        <MarketGrid rows={fresh} photos={photos} onOpen={setOpenId} />
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
          // A hand-uploaded photo carries over to the seller (same bucket), first, next to any added in the card.
          if (listing.image_path) {
            const { data } = await createClient().from("properties").select("image_paths").eq("id", propertyId).single();
            await saveProperty
              .mutateAsync({ id: propertyId, values: { image_paths: [listing.image_path, ...(data?.image_paths ?? [])] } })
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
