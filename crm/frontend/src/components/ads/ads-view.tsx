"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, ImagesIcon, MegaphoneIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { AD_TOOL_URL } from "@/lib/ad-tool";
import { errorMessage, useSignedUrls } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { SavedAd } from "@/lib/types";

/** The ad tool saves each ad's files here, under the ad's id (see ad-tool/frontend/public/index.html). */
const BUCKET = "saved-ads";
const filesOf = (ad: SavedAd) => [
  `${ad.id}/ad.png`,
  `${ad.id}/thumb.jpg`,
  ...[0, 1, 2].map((i) => `${ad.id}/photo-${i}.jpg`),
];
const fileName = (ad: SavedAd) => `מודעה_${ad.title.replace(/\s+/g, "_")}.png`;

/**
 * "המודעות שלי": every ad made in the ad tool while signed in, saved there automatically.
 * An agent sees the ads they appear on or made; the manager sees the whole office, by agent.
 */
export function AdsView() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const [agent, setAgent] = useState("");
  const [deleting, setDeleting] = useState<SavedAd | null>(null);

  const { data: ads = [], isLoading, error } = useQuery({
    queryKey: ["saved_ads"],
    queryFn: async (): Promise<SavedAd[]> => {
      const { data, error } = await createClient().from("saved_ads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // The manager's filter: the agents who have ads, by the name printed on the ad.
  const agents = useMemo(() => {
    const names = new Map<string, string>();
    for (const a of ads) if (a.agent_profile_id) names.set(a.agent_profile_id, a.agent_name || "ללא שם");
    return [...names].sort((x, y) => x[1].localeCompare(y[1], "he"));
  }, [ads]);
  const rows = agent ? ads.filter((a) => a.agent_profile_id === agent) : ads;
  const thumbs = useSignedUrls(BUCKET, rows.map((a) => `${a.id}/thumb.jpg`)).data ?? {};

  return (
    <>
      <PageHeader
        title={admin ? "מודעות המשרד" : "המודעות שלי"}
        count={rows.length}
        description="כל מודעה שיוצרים בכלי המודעות נשמרת כאן לבד."
        actions={
          <>
            {admin && agents.length > 1 && (
              <NativeSelect value={agent} onChange={(e) => setAgent(e.target.value)} aria-label="סינון לפי סוכן" className="bg-card sm:w-48">
                <option value="">כל הסוכנים</option>
                {agents.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button render={<a href={AD_TOOL_URL} target="_blank" rel="noopener" />} nativeButton={false}>
              <MegaphoneIcon />
              מודעה חדשה
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ImagesIcon />}
          title="עדיין אין כאן מודעות"
          hint="כל מודעה שיוצרים בכלי המודעות, כשמחוברים למערכת, תישמר כאן אוטומטית."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {rows.map((ad) => (
            <AdCard key={ad.id} ad={ad} thumb={thumbs[`${ad.id}/thumb.jpg`]} showAgent={admin} onDelete={() => setDeleting(ad)} />
          ))}
        </div>
      )}

      <DeleteAdDialog ad={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function AdCard({ ad, thumb, showAgent, onDelete }: { ad: SavedAd; thumb?: string; showAgent: boolean; onDelete: () => void }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(`${ad.id}/ad.png`, 300, { download: fileName(ad) });
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.click();
  }

  async function share() {
    setBusy(true);
    const { data, error } = await createClient().storage.from(BUCKET).download(`${ad.id}/ad.png`);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    const file = new File([data], fileName(ad), { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "מודעה RE/MAX" });
      } catch {
        // Closed the share sheet: nothing to do.
      }
    } else {
      toast("השיתוף לא נתמך בדפדפן הזה, אז המודעה יורדת למחשב");
      download();
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <button type="button" onClick={download} disabled={busy} className="relative aspect-square bg-muted" aria-label={`הורדת ${ad.title}`}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 size-full object-contain" />
        ) : (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
      </button>
      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{ad.title}</p>
        {ad.price && <p className="text-sm tabular-nums text-primary">{ad.price} ₪</p>}
        <p className="mt-auto text-xs text-muted-foreground">
          {showAgent && ad.agent_name ? `${ad.agent_name} · ` : ""}
          {formatDate(ad.created_at)}
        </p>
      </div>
      <div className="grid grid-cols-4 border-t">
        <AdAction label="הורדה" onClick={download} disabled={busy}>
          <DownloadIcon />
        </AdAction>
        <AdAction label="שיתוף" onClick={share} disabled={busy}>
          <Share2Icon />
        </AdAction>
        <AdAction label="עריכה" href={`${AD_TOOL_URL}#saved=${ad.id}`}>
          <PencilIcon />
        </AdAction>
        <AdAction label="מחיקה" onClick={onDelete} danger>
          <Trash2Icon />
        </AdAction>
      </div>
    </div>
  );
}

function AdAction({
  label,
  onClick,
  href,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "flex flex-col items-center gap-0.5 border-s py-1.5 text-[11px] text-secondary-foreground first:border-s-0 hover:bg-secondary disabled:opacity-50 [&_svg]:size-4 " +
    (danger ? "text-destructive hover:bg-destructive/10" : "");
  return href ? (
    // "Edit" opens the ad tool in a new tab, filled in with this ad.
    <a href={href} target="_blank" rel="noopener" className={className} title={label}>
      {children}
      {label}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={className} title={label}>
      {children}
      {label}
    </button>
  );
}

function DeleteAdDialog({ ad, onClose }: { ad: SavedAd | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!ad) return;
    setPending(true);
    const supabase = createClient();
    // Files first: they can be removed only while the ad's row still exists.
    await supabase.storage.from(BUCKET).remove(filesOf(ad));
    const { error } = await supabase.from("saved_ads").delete().eq("id", ad.id);
    setPending(false);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["saved_ads"] });
    toast.success("המודעה נמחקה");
    onClose();
  }

  return (
    <Dialog open={!!ad} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>למחוק את המודעה?</DialogTitle>
          <DialogDescription>
            {ad?.title} תימחק מהתיקייה, יחד עם התמונות שלה. אי אפשר לבטל את זה. מודעות שכבר נשלחו או הורדו לא מושפעות.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            מחיקה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
