"use client";

import { Building2Icon, ExternalLinkIcon, ImagePlusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDelete, Panel, SaveFooter } from "@/components/crm/panel";
import { StatusBadge } from "@/components/crm/status-badge";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { MEDIA_BUCKET, PendingImages, uploadPropertyImages } from "@/components/properties/property-images";
import { PropertyPlaceholder } from "@/components/properties/property-placeholder";
import { Button } from "@/components/ui/button";
import { errorMessage, useAgentName, useDeleteRecord, useRecord, useSaveRecord, useSignedUrls } from "@/lib/data";
import { formatDate, formatILS, formatRelative } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import type { MarketListing } from "@/lib/types";
import { DismissDialog } from "./dismiss-dialog";
import { LISTING_SECTIONS, NEW_LISTING } from "./listing-fields";
import { listingPhoto, listingPlace, listingTitle } from "./market-list";

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
  const { data: signed = {} } = useSignedUrls(MEDIA_BUCKET, listing?.image_path ? [listing.image_path] : []);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(listingId: string, file: File) {
    const { paths } = await uploadPropertyImages(photoFolder(listingId), [file]);
    if (!paths[0]) throw new Error("התמונה לא הועלתה");
    await saveQuiet.mutateAsync({ id: listingId, values: { image_path: paths[0] } });
  }

  if (creating) {
    return (
      <Panel
        dirty={form.dirty || photos.length > 0}
        open
        onClose={onClose}
        title="מודעה חדשה למאגר"
        subtitle="מדביקים את הקישור למודעה, מוסיפים תמונה וממלאים מה שידוע"
        footer={
          <Button
            disabled={save.isPending || busy}
            onClick={() => {
              if (!form.validate()) return;
              save.mutate(
                { values: { ...toPayload(LISTING_SECTIONS, form.values), source: "יד2" } },
                {
                  onSuccess: async (row) => {
                    if (photos[0]) {
                      setBusy(true);
                      try {
                        await uploadPhoto(row.id, photos[0]);
                      } catch (e) {
                        toast.error(`המודעה נשמרה, אבל התמונה לא: ${errorMessage(e)}`);
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
            {busy ? "מעלה תמונה…" : save.isPending ? "שומר…" : "שמור"}
          </Button>
        }
      >
        {/* One photo per listing: picking again replaces it. */}
        <PendingImages files={photos} onChange={(files) => setPhotos(files.slice(-1))} />
        <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="new-listing" />
      </Panel>
    );
  }

  const open = listing?.status === "new" || listing?.status === "contacted";
  const photo = listing && listingPhoto(listing, signed);
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
      title={listing && [listingTitle(listing), listing.price && formatILS(listing.price)].filter(Boolean).join(" · ")}
      subtitle={listing && [listingPlace(listing), `${listing.source} · נכנס ${formatRelative(listing.listed_at)}`].filter(Boolean).join(" · ")}
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

          <div className="relative mb-4 overflow-hidden rounded-xl">
            {photo ? (
              // Outside or short-lived signed URLs; next/image optimization isn't useful here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="h-36">
                <PropertyPlaceholder label="אין תמונה" />
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-3 start-3 shadow"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlusIcon />
              {busy ? "מעלה…" : photo ? "החלף תמונה" : "הוסף תמונה"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                try {
                  await uploadPhoto(listing.id, file);
                } catch (err) {
                  toast.error(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-secondary/50 p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>

          {listing.url && (
            <Button variant="outline" className="mb-6 w-full" render={<a href={listing.url} target="_blank" rel="noopener" />} nativeButton={false}>
              <ExternalLinkIcon />
              פתח את המודעה ביד2 (שם הטלפון של הבעלים)
            </Button>
          )}

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
