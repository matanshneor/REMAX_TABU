"use client";

import { Building2Icon, PlusIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Money } from "@/components/crm/money";
import { ConfirmDelete, Panel, SaveFooter } from "@/components/crm/panel";
import { StatusBadge } from "@/components/crm/status-badge";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { PendingImages, PropertyImages, uploadPropertyImages } from "@/components/properties/property-images";
import { Button } from "@/components/ui/button";
import { errorMessage, useAgentName, useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatDate, formatRelative } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import type { MarketListing } from "@/lib/types";
import { DismissDialog } from "./dismiss-dialog";
import { LISTING_SECTIONS, NEW_LISTING } from "./listing-fields";
import { listingPlace, listingTitle } from "./market-list";

/** A hand-uploaded listing photo lives in the property photos bucket, under listings/<id>. */
const photoFolder = (id: string) => `listings/${id}`;

/**
 * A listing's card: photo, facts, the ad's link and notes, and the two outcomes —
 * "העבר למוכרים שלי" or "לא רלוונטי" (with a reason; "החזר לחדשים" undoes it).
 * With `creating`, the same card adds a listing by hand, photo included.
 */
export function ListingPanel({
  id,
  creating = false,
  onClose,
  onCreated,
  onAddToSellers,
  canOpenSeller,
}: {
  id: string | null;
  creating?: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  onAddToSellers: (l: MarketListing) => void;
  canOpenSeller: (l: MarketListing) => boolean;
}) {
  const { profile } = useAuth();
  const agentName = useAgentName();
  const { data: listing, isLoading } = useRecord<MarketListing>("market_listings", creating ? null : id);
  const form = useFormValues(LISTING_SECTIONS, creating ? NEW_LISTING : listing, creating ? "new" : `${listing?.id}:${listing?.updated_at}`);
  const save = useSaveRecord<MarketListing>("market_listings");
  const saveQuiet = useSaveRecord<MarketListing>("market_listings", { silent: true });
  const remove = useDeleteRecord("market_listings");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (creating) {
    return (
      <Panel
        dirty={form.dirty || photos.length > 0}
        open
        onClose={onClose}
        title="מודעה חדשה למאגר"
        subtitle="מדביקים את הקישור למודעה, מוסיפים תמונות וממלאים מה שידוע"
        footer={
          <Button
            disabled={save.isPending || busy}
            onClick={() => {
              if (!form.validate()) return;
              save.mutate(
                { values: { ...toPayload(LISTING_SECTIONS, form.values), source: "יד2" } },
                {
                  onSuccess: async (row) => {
                    if (photos.length) {
                      setBusy(true);
                      try {
                        const { paths, failed } = await uploadPropertyImages(photoFolder(row.id), photos);
                        if (paths.length) await saveQuiet.mutateAsync({ id: row.id, values: { image_paths: paths } });
                        if (failed) toast.error(`המודעה נשמרה, אבל ${failed > 1 ? `${failed} תמונות לא הועלו` : "תמונה אחת לא הועלתה"}`);
                      } catch (e) {
                        toast.error(`המודעה נשמרה, אבל התמונות לא: ${errorMessage(e)}`);
                      } finally {
                        setBusy(false);
                        setPhotos([]);
                      }
                    }
                    onCreated(row.id);
                  },
                },
              );
            }}
          >
            {busy ? "מעלה תמונות…" : save.isPending ? "שומר…" : "שמור"}
          </Button>
        }
      >
        <PendingImages files={photos} onChange={setPhotos} />
        <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="new-listing" />
      </Panel>
    );
  }

  const open = listing?.status === "new" || listing?.status === "contacted";
  const facts = listing
    ? ([
        ["חדרים", listing.rooms],
        ["גודל", listing.size_sqm && `${listing.size_sqm} מ״ר`],
        ["קומה", listing.floor != null && (listing.floor === 0 ? "קרקע" : listing.floor)],
      ] as const)
    : [];

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !listing}
      missing={!!id && !isLoading && !listing}
      title={
        listing && (
          <>
            {listingTitle(listing)}
            {listing.price != null && (
              <>
                {" · "}
                <Money value={listing.price} />
              </>
            )}
          </>
        )
      }
      subtitle={
        listing &&
        [listingPlace(listing), `פורסם ב${listing.source} ${formatDate(listing.listed_at)} · נכנס למאגר ${formatRelative(listing.created_at)}`]
          .filter(Boolean)
          .join(" · ")
      }
      badges={listing && !open && <StatusBadge map={LISTING_STATUS} value={listing.status} />}
      footer={
        listing &&
        (form.dirty ? (
          <SaveFooter
            dirty
            saving={save.isPending}
            onSave={() => form.validate() && save.mutate({ id: listing.id, values: form.changes })}
            onReset={form.reset}
          />
        ) : (
          <>
            {open ? (
              <>
                <Button onClick={() => onAddToSellers(listing)}>
                  <PlusIcon />
                  העבר למוכרים שלי
                </Button>
                <Button variant="outline" onClick={() => setDismissing(true)}>
                  לא רלוונטי
                </Button>
              </>
            ) : listing.status === "not_interested" ? (
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({ id: listing.id, values: { status: "new", dismissed_reason: null, dismissed_by: null, dismissed_at: null } })
                }
              >
                <RotateCcwIcon />
                החזר לחדשים
              </Button>
            ) : null}
            {isAdmin(profile) && <ConfirmDelete onConfirm={() => remove.mutate(listing.id, { onSuccess: onClose })} />}
          </>
        ))
      }
    >
      {listing && (
        <>
          {listing.status === "not_interested" && (
            <p className="mb-4 rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
              סומן <b>לא רלוונטי</b> ע״י {agentName(listing.dismissed_by)}
              {listing.dismissed_at && ` · ${formatDate(listing.dismissed_at)}`}
              {listing.dismissed_reason && (
                <>
                  {" "}
                  · <span className="text-muted-foreground">{listing.dismissed_reason}</span>
                </>
              )}
            </p>
          )}
          {listing.status === "added" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <span>הועבר למוכרים של {agentName(listing.assigned_to)}</span>
              {listing.property_id && canOpenSeller(listing) && (
                <Button variant="outline" size="sm" render={<Link href={`/properties?open=${listing.property_id}`} />} nativeButton={false}>
                  <Building2Icon />
                  לכרטיס המוכר
                </Button>
              )}
            </div>
          )}

          {/* A photo from Yad2's e-mail (not stored here) shows until photos are added. */}
          {!listing.image_paths.length && listing.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.image_url} alt="" className="mb-2 aspect-[16/10] w-full rounded-xl object-cover" />
          )}
          {/* All of them move to the seller on "העבר למוכרים שלי". */}
          <PropertyImages property={listing} editable table="market_listings" folder={photoFolder(listing.id)} />

          <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-secondary/50 p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>

          <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="listing" />

          <DismissDialog
            open={dismissing}
            onOpenChange={setDismissing}
            busy={save.isPending}
            onConfirm={(reason) =>
              save.mutate(
                {
                  id: listing.id,
                  values: { status: "not_interested", dismissed_reason: reason, dismissed_by: profile?.id, dismissed_at: new Date().toISOString() },
                },
                { onSuccess: () => setDismissing(false) },
              )
            }
          />
        </>
      )}
    </Panel>
  );
}
