"use client";

import { useQuery } from "@tanstack/react-query";
import { InboxIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Segmented } from "@/components/crm/segmented";
import { PropertyPanel } from "@/components/properties/property-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentName, useSaveRecord } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { ListingPanel } from "./listing-panel";
import { MarketList } from "./market-list";

type View = "open" | "mine" | "done" | "all";

const VIEWS: Record<View, (l: MarketListing, myId?: string) => boolean> = {
  // Still to work: new, or called and waiting.
  open: (l) => l.status === "new" || l.status === "contacted",
  mine: (l, myId) => l.assigned_to === myId && (l.status === "new" || l.status === "contacted"),
  done: (l) => l.status === "added" || l.status === "not_interested",
  all: () => true,
};

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

/** "מאגר יד2": new private listings to call; the ones whose owners want the service become sellers. */
export function MarketView() {
  const { profile } = useAuth();
  const router = useRouter();
  const agentName = useAgentName();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [view, setView] = useState<View>("open");
  const [text, setText] = useState("");
  // The listing being turned into a seller (opens the "new seller" card, filled in).
  const [toSeller, setToSeller] = useState<MarketListing | null>(null);
  const saveListing = useSaveRecord<MarketListing>("market_listings", { silent: true });

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["market_listings", "list"],
    queryFn: async () => {
      const { data, error } = await createClient().from("market_listings").select("*").order("listed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    return listings
      .filter((l) => VIEWS[view](l, profile?.id))
      .filter((l) => !t || [l.title, l.street, l.neighborhood, l.city, l.advertiser, l.phone].some((s) => s?.toLowerCase().includes(t)));
  }, [listings, view, text, profile?.id]);

  const count = (v: View) => listings.filter((l) => VIEWS[v](l, profile?.id)).length;

  return (
    <>
      <PageHeader
        title="מאגר יד2"
        count={listings.filter((l) => l.status === "new").length}
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

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2.5">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: "לטיפול", count: count("open") },
            { value: "mine", label: "שלי", count: count("mine") },
            { value: "done", label: "טופלו", count: count("done") },
            { value: "all", label: "הכל", count: listings.length },
          ]}
        />
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="חיפוש רחוב, שכונה, מפרסם או טלפון…" className="ps-9" />
        </div>
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title={listings.length ? "אין מודעות בתצוגה הזו" : "המאגר עדיין ריק"}
          hint={listings.length ? "נסו תצוגה אחרת." : "מודעות חדשות מיד2 ייכנסו לכאן לבד. אפשר גם להוסיף מודעה ידנית."}
        />
      ) : (
        <MarketList
          rows={rows}
          agentName={agentName}
          myId={profile?.id}
          onOpen={setOpenId}
          onTake={(l) =>
            saveListing.mutate(
              { id: l.id, values: { assigned_to: profile?.id } },
              { onSuccess: () => toast.success("המודעה אצלך") },
            )
          }
          onAddToSellers={setToSeller}
        />
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
      />
      <PropertyPanel
        id={null}
        creating={!!toSeller}
        prefill={toSeller ? sellerFromListing(toSeller) : undefined}
        onClose={() => setToSeller(null)}
        onCreated={(propertyId) => {
          const listing = toSeller!;
          setToSeller(null);
          // Mark the listing done and linked, then show the new seller's card.
          saveListing.mutate(
            { id: listing.id, values: { status: "added", property_id: propertyId, assigned_to: listing.assigned_to ?? profile?.id } },
            { onSettled: () => router.push(`/properties?open=${propertyId}`) },
          );
        }}
      />
    </>
  );
}
