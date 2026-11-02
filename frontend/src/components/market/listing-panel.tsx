"use client";

import { Building2Icon, ExternalLinkIcon, PlusIcon, RotateCcwIcon, ThumbsDownIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { StatusBadge } from "@/components/crm/status-badge";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { Button } from "@/components/ui/button";
import { useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import type { MarketListing } from "@/lib/types";
import { LISTING_SECTIONS, NEW_LISTING } from "./listing-fields";
import { listingTitle } from "./market-list";

/**
 * A listing from the pool: its details, who's on it, notes, and "הוסף למוכרים".
 * With `creating`, the same card adds a listing by hand (e.g. an ad seen elsewhere).
 */
export function ListingPanel({
  id,
  creating = false,
  onClose,
  onCreated,
  onAddToSellers,
  onNotInterested,
  canOpenSeller,
}: {
  id: string | null;
  creating?: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  onAddToSellers: (l: MarketListing) => void;
  onNotInterested: (l: MarketListing) => void;
  canOpenSeller: (l: MarketListing) => boolean;
}) {
  const { profile } = useAuth();
  const { data: listing, isLoading } = useRecord<MarketListing>("market_listings", creating ? null : id);
  const form = useFormValues(LISTING_SECTIONS, creating ? NEW_LISTING : listing, creating ? "new" : `${listing?.id}:${listing?.updated_at}`);
  const save = useSaveRecord<MarketListing>("market_listings");
  const remove = useDeleteRecord("market_listings");

  if (creating) {
    return (
      <Panel
        dirty={form.dirty}
        open
        onClose={onClose}
        title="מודעה חדשה למאגר"
        subtitle="מדביקים את הקישור למודעה וממלאים מה שידוע"
        footer={
          <Button
            onClick={() => {
              if (!form.validate()) return;
              save.mutate({ values: { ...toPayload(LISTING_SECTIONS, form.values), source: "יד2" } }, { onSuccess: (row) => onCreated(row.id) });
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "שומר…" : "שמור"}
          </Button>
        }
      >
        <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="new-listing" />
      </Panel>
    );
  }

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !listing}
      missing={!!id && !isLoading && !listing}
      title={listing && listingTitle(listing)}
      subtitle={listing && `${listing.source} · נכנס ${formatRelative(listing.listed_at)}`}
      badges={listing && <StatusBadge map={LISTING_STATUS} value={listing.status} />}
      headerActions={
        listing && (
          <>
            {listing.url && (
              <Button variant="outline" size="sm" render={<a href={listing.url} target="_blank" rel="noopener" />} nativeButton={false}>
                <ExternalLinkIcon />
                פתח ביד2
              </Button>
            )}
            {listing.status === "new" || listing.status === "contacted" ? (
              <>
                <Button variant="outline" size="sm" onClick={() => onNotInterested(listing)}>
                  <ThumbsDownIcon />
                  דיברתי – לא מעוניין
                </Button>
                <Button size="sm" onClick={() => onAddToSellers(listing)}>
                  <PlusIcon />
                  הוסף למוכרים שלי
                </Button>
              </>
            ) : listing.status === "not_interested" ? (
              <Button variant="outline" size="sm" onClick={() => save.mutate({ id: listing.id, values: { status: "new" } })}>
                <RotateCcwIcon />
                החזר לטיפול
              </Button>
            ) : (
              listing.property_id &&
              canOpenSeller(listing) && (
                <Button variant="outline" size="sm" render={<Link href={`/properties?open=${listing.property_id}`} />} nativeButton={false}>
                  <Building2Icon />
                  לכרטיס המוכר
                </Button>
              )
            )}
          </>
        )
      }
      footer={
        listing && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            onSave={() => form.validate() && save.mutate({ id: listing.id, values: form.changes })}
            onReset={form.reset}
            onDelete={isAdmin(profile) ? () => remove.mutate(listing.id, { onSuccess: onClose }) : undefined}
          />
        )
      }
    >
      {listing && <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="listing" />}
    </Panel>
  );
}
