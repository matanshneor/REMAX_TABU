"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2Icon, CopyPlusIcon, ExternalLinkIcon, PencilIcon, PhoneIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Money } from "@/components/crm/money";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { ConfirmDelete, Panel, SaveFooter } from "@/components/crm/panel";
import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { toPayload } from "@/components/form/values";
import { PendingImages, PropertyImages, uploadPropertyImages } from "@/components/properties/property-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatDate, formatRelative } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";
import { DismissDialog } from "./dismiss-dialog";
import { myDismissalsKey } from "./use-market";
import { LISTING_SECTIONS, NEW_LISTING, NEW_LISTING_SECTIONS } from "./listing-fields";
import { listingPlace, listingTitle } from "./market-list";

/** A hand-uploaded listing photo lives in the property photos bucket, under listings/<id>. */
const photoFolder = (id: string) => `listings/${id}`;

/**
 * A listing's card: photo, facts, the ad's link and notes, and the user's own outcomes —
 * "העתק למוכרים שלי" (once; then a link to their seller) and "לא רלוונטי" (with a reason, for
 * them only; "החזר למאגר" undoes it). Neither changes the listing for anyone else.
 * With `creating`, the same card adds a listing by hand, photo included.
 */
export function ListingPanel({
  id,
  creating = false,
  onClose,
  onCreated,
  onCopyToSellers,
  copiedSellerId,
  dismissal,
}: {
  id: string | null;
  creating?: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  onCopyToSellers: (l: MarketListing) => void;
  /** This user's seller copied from the listing, if they copied it. */
  copiedSellerId?: string;
  /** This user marked it "לא רלוונטי". */
  dismissal?: { reason: string; dismissed_at: string };
}) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  // "לא רלוונטי" is personal: marking and undoing it touch only this user's row.
  const dismiss = useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: string; reason: string | null }) => {
      const table = createClient().from("market_listing_dismissals");
      const { error } = reason
        ? await table.insert({ listing_id: listingId, reason })
        : await table.delete().eq("listing_id", listingId).eq("user_id", profile!.id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: myDismissalsKey(profile?.id) }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const { data: listing, isLoading } = useRecord<MarketListing>("market_listings", creating ? null : id);
  const form = useFormValues(LISTING_SECTIONS, creating ? NEW_LISTING : listing, creating ? "new" : `${listing?.id}:${listing?.updated_at}`);
  const save = useSaveRecord<MarketListing>("market_listings");
  const saveQuiet = useSaveRecord<MarketListing>("market_listings", { silent: true });
  const remove = useDeleteRecord("market_listings");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  // The phone is edited in the contact box (it isn't in the form below).
  const [editingPhone, setEditingPhone] = useState(false);

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
            {busy ? "מעלה תמונות…" : save.isPending ? "שומר…" : "שמירה"}
          </Button>
        }
      >
        <PendingImages files={photos} onChange={setPhotos} />
        <EntityForm sections={NEW_LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="new-listing" />
      </Panel>
    );
  }

  const facts = listing
    ? ([
        ["חדרים", listing.rooms],
        ["גודל", listing.size_sqm && `${listing.size_sqm} מ״ר`],
        ["קומה", listing.floor != null && (listing.floor === 0 ? "קרקע" : listing.floor)],
        ["סוג", listing.property_type],
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
        listing && (
          <>
            {listingPlace(listing)}
            {/* The two dates on their own line, as small tags. */}
            <span className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs text-orange-700">
                פורסם ב{listing.source} · {formatDate(listing.listed_at)}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                נכנס למאגר · {formatRelative(listing.created_at)}
              </span>
            </span>
          </>
        )
      }
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
            {copiedSellerId ? (
              <Button render={<Link href={`/properties?open=${copiedSellerId}`} />} nativeButton={false}>
                <Building2Icon />
                למוכר שלי
              </Button>
            ) : (
              <Button onClick={() => onCopyToSellers(listing)}>
                <CopyPlusIcon />
                העתק למוכרים שלי
              </Button>
            )}
            {dismissal ? (
              <Button
                variant="outline"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate({ listingId: listing.id, reason: null })}
              >
                <RotateCcwIcon />
                החזר למאגר
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDismissing(true)}>
                לא רלוונטי
              </Button>
            )}
            {isAdmin(profile) && <ConfirmDelete onConfirm={() => remove.mutate(listing.id, { onSuccess: onClose })} />}
          </>
        ))
      }
    >
      {listing && (
        <>
          {dismissal && (
            <p className="mb-4 rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
              סימנת <b>לא רלוונטי</b> · {formatDate(dismissal.dismissed_at)} ·{" "}
              <span className="text-muted-foreground">{dismissal.reason}</span>
              <span className="block text-xs text-muted-foreground">זה מוסתר רק אצלך. שאר הסוכנים עדיין רואים את המודעה.</span>
            </p>
          )}
          {copiedSellerId && (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              המודעה כבר אצלך במוכרים. ההערות והמשימות שלך נמצאות בכרטיס המוכר שלך.
            </p>
          )}

          {/* A photo from Yad2's e-mail (not stored here) shows until photos are added. */}
          {!listing.image_paths.length && listing.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.image_url} alt="" className="mb-2 aspect-[16/10] w-full rounded-xl object-cover" />
          )}
          {/* They are copied to the seller on "העתק למוכרים שלי" (and stay here too). */}
          <PropertyImages property={listing} editable table="market_listings" folder={photoFolder(listing.id)} />

          <div className="mb-4 grid grid-cols-4 gap-2 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-secondary/50 p-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value || "—"}</p>
              </div>
            ))}
          </div>

          {/* Who to call, with the ways to reach them. */}
          {(
            <div className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{listing.advertiser || "המפרסם"}</p>
                {editingPhone ? (
                  <Input
                    type="tel"
                    dir="ltr"
                    autoFocus
                    aria-label="טלפון"
                    value={(form.values.phone as string) ?? ""}
                    onChange={(e) => form.set("phone", e.target.value)}
                    onBlur={() => setEditingPhone(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingPhone(false)}
                    className="mt-1 h-8 max-w-48 text-end"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingPhone(true)}
                    title="עריכת הטלפון"
                    className="group/phone flex items-center gap-1.5 tabular-nums"
                  >
                    <span dir="ltr">{(form.values.phone as string) || "הוסף טלפון"}</span>
                    <PencilIcon className="size-3.5 text-muted-foreground opacity-60 group-hover/phone:opacity-100" />
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  ייתכן שזה מספר וירטואלי של יד2, שעובד רק כל עוד המודעה פעילה. כשיש מספר אמיתי, לוחצים על המספר ומעדכנים.
                </p>
              </div>
              {listing.phone && (
                <>
                  <WhatsAppButton phone={listing.phone} size="icon-sm" solid label={`וואטסאפ ל${listing.advertiser || "מפרסם"}`} />
                  <Button variant="outline" size="icon-sm" render={<a href={`tel:${listing.phone.replace(/[^\d+]/g, "")}`} />} nativeButton={false} aria-label="חיוג" title="חיוג">
                    <PhoneIcon />
                  </Button>
                </>
              )}
              {listing.url && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  render={<a href={listing.url} target="_blank" rel="noopener" />}
                  nativeButton={false}
                  aria-label="פתיחת המודעה ביד2"
                  title="פתיחת המודעה ביד2"
                >
                  <ExternalLinkIcon />
                </Button>
              )}
            </div>
          )}

          <EntityForm sections={LISTING_SECTIONS} values={form.values} onChange={form.set} idPrefix="listing" />

          <DismissDialog
            open={dismissing}
            onOpenChange={setDismissing}
            busy={dismiss.isPending}
            onConfirm={(reason) => dismiss.mutate({ listingId: listing.id, reason }, { onSuccess: () => setDismissing(false) })}
          />
        </>
      )}
    </Panel>
  );
}
