"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, DownloadIcon, ImagesIcon, MegaphoneIcon, MessageCircleIcon, PencilIcon, Share2Icon, Trash2Icon } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
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
import { cn } from "@/lib/utils";

/** The ad tool saves each ad's files here, under the ad's id (see ad-tool/frontend/public/index.html). */
const BUCKET = "saved-ads";
const filesOf = (ad: SavedAd) => [
  `${ad.id}/ad.png`,
  `${ad.id}/thumb.jpg`,
  ...[0, 1, 2].map((i) => `${ad.id}/photo-${i}.jpg`),
];
/** Two ads in a row on a phone; on wider screens, as many columns of about 200px as fit. */
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4";
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
  // The ad opened in the preview (a click on its picture).
  const [previewing, setPreviewing] = useState<SavedAd | null>(null);

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
        <div className={GRID}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[1/2] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ImagesIcon />}
          title="עדיין אין כאן מודעות"
          hint="כל מודעה שיוצרים בכלי המודעות, כשמחוברים למערכת, תישמר כאן אוטומטית."
        />
      ) : (
        <div className={GRID}>
          {rows.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              thumb={thumbs[`${ad.id}/thumb.jpg`]}
              showAgent={admin}
              onOpen={() => setPreviewing(ad)}
              onDelete={() => setDeleting(ad)}
            />
          ))}
        </div>
      )}

      <AdPreviewDialog
        ad={previewing}
        thumb={previewing ? thumbs[`${previewing.id}/thumb.jpg`] : undefined}
        showAgent={admin}
        onClose={() => setPreviewing(null)}
        onDelete={() => {
          setDeleting(previewing);
          setPreviewing(null);
        }}
      />
      <DeleteAdDialog ad={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

const noopSubscribe = () => () => {};
/** A phone or tablet: the browser's share sheet offers WhatsApp there. On a computer it usually doesn't. */
function useIsPhone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    () => false,
  );
}

/** Download, share and copy of a saved ad, for its card and for its preview. */
function useAdActions(ad: SavedAd) {
  const [busy, setBusy] = useState(false);
  const isPhone = useIsPhone();

  /** Puts the ad's picture on the clipboard. Returns whether it worked. */
  async function copyImage() {
    const { data, error } = await createClient().storage.from(BUCKET).download(`${ad.id}/ad.png`);
    if (error) {
      toast.error(errorMessage(error));
      return false;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": data })]);
      return true;
    } catch {
      toast.error("לא הצלחנו להעתיק את התמונה. אפשר להוריד אותה ולצרף ידנית.");
      return false;
    }
  }

  async function copy() {
    setBusy(true);
    const ok = await copyImage();
    setBusy(false);
    if (ok) toast.success("התמונה הועתקה. אפשר להדביק אותה בשיחה (הדבק).");
  }

  /** On a computer: copy the picture and open WhatsApp Web; in a chat the agent chooses "paste". */
  async function whatsapp() {
    setBusy(true);
    const ok = await copyImage();
    setBusy(false);
    if (!ok) return;
    const w = window.open("https://web.whatsapp.com/", "_blank", "noopener");
    toast.success(
      w ? "התמונה הועתקה. בוואטסאפ פותחים שיחה, לוחצים בתיבת ההודעה ובוחרים ״הדבק״." : "התמונה הועתקה, אבל וואטסאפ ווב לא נפתח. פותחים אותו בלשונית חדשה ובשיחה בוחרים ״הדבק״.",
    );
  }

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

  return { busy, isPhone, download, share, copy, whatsapp };
}

function AdCard({
  ad,
  thumb,
  showAgent,
  onOpen,
  onDelete,
}: {
  ad: SavedAd;
  thumb?: string;
  showAgent: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { busy, isPhone, download, share, whatsapp } = useAdActions(ad);

  return (
    // A gallery card: the ad is the main thing. Its title and price are printed on the ad itself, so they aren't repeated.
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-card">
      {/* The whole ad, never cropped. A click opens the preview (it doesn't download). */}
      <button
        type="button"
        onClick={onOpen}
        title={ad.title}
        aria-label={`תצוגה מקדימה של ${ad.title}`}
        className="relative aspect-[3/5] overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 size-full object-contain object-top" />
        ) : (
          <Skeleton className="absolute inset-0" />
        )}
      </button>
      <p className="flex items-baseline justify-between gap-2 px-0.5 text-[13px]">
        {/* The manager sees whose ad it is; an agent, on their own ads, sees which ad it is. */}
        <span className="min-w-0 truncate font-semibold">{(showAgent && ad.agent_name) || ad.title}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{formatDate(ad.created_at)}</span>
      </p>
      {/* The main button, and the three small ones under it. */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={isPhone ? share : whatsapp}
          disabled={busy}
          className={cn(
            "flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold whitespace-nowrap text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 pointer-coarse:h-10 [&_svg]:size-4",
            isPhone ? "bg-primary hover:bg-primary/90" : "bg-whatsapp hover:bg-whatsapp-hover",
          )}
        >
          {isPhone ? <Share2Icon /> : <MessageCircleIcon />}
          {isPhone ? "שיתוף" : "שלח בוואטסאפ"}
        </button>
        <div className="flex gap-1">
          <AdIconAction label="הורדה" onClick={download} disabled={busy}>
            <DownloadIcon />
          </AdIconAction>
          <AdIconAction label="עריכה" href={`${AD_TOOL_URL}#saved=${ad.id}`}>
            <PencilIcon />
          </AdIconAction>
          <AdIconAction label="מחיקה" onClick={onDelete} danger>
            <Trash2Icon />
          </AdIconAction>
        </div>
      </div>
    </div>
  );
}

/** The ad at full size, with the same actions as its card. */
function AdPreviewDialog({
  ad,
  thumb,
  showAgent,
  onClose,
  onDelete,
}: {
  ad: SavedAd | null;
  thumb?: string;
  showAgent: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Dialog open={!!ad} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">{ad && <AdPreview ad={ad} thumb={thumb} showAgent={showAgent} onDelete={onDelete} />}</DialogContent>
    </Dialog>
  );
}

function AdPreview({ ad, thumb, showAgent, onDelete }: { ad: SavedAd; thumb?: string; showAgent: boolean; onDelete: () => void }) {
  const { busy, isPhone, download, share, copy, whatsapp } = useAdActions(ad);
  const path = `${ad.id}/ad.png`;
  const full = useSignedUrls(BUCKET, [path]).data?.[path];
  // The small picture shows at once, until the full one has come.
  const src = full ?? thumb;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-normal">{ad.title}</DialogTitle>
        <DialogDescription>
          {ad.price ? `${ad.price} ₪ · ` : ""}
          {showAgent && ad.agent_name ? `${ad.agent_name} · ` : ""}
          {formatDate(ad.created_at)}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-48 items-center justify-center rounded-lg bg-muted p-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={ad.title} className="max-h-[62vh] w-auto max-w-full rounded object-contain" />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
      </div>
      <DialogFooter className="sm:justify-start">
        <Button onClick={download} disabled={busy}>
          <DownloadIcon />
          הורדה
        </Button>
        {!isPhone && (
          <Button variant="outline" onClick={whatsapp} disabled={busy} className="border-green-600 font-semibold text-green-700 hover:text-green-700 dark:text-green-500">
            <MessageCircleIcon />
            שלח בוואטסאפ
          </Button>
        )}
        <Button variant="outline" onClick={share} disabled={busy}>
          <Share2Icon />
          שיתוף
        </Button>
        {!isPhone && (
          <Button variant="outline" onClick={copy} disabled={busy}>
            <CopyIcon />
            העתק תמונה
          </Button>
        )}
        <Button variant="outline" render={<a href={`${AD_TOOL_URL}#saved=${ad.id}`} target="_blank" rel="noopener" />} nativeButton={false}>
          <PencilIcon />
          עריכה
        </Button>
        <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive sm:ms-auto">
          <Trash2Icon />
          מחיקה
        </Button>
      </DialogFooter>
    </>
  );
}

/** A small icon button on an ad's card; its name shows on hover and to screen readers. */
function AdIconAction({
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
  const className = cn(
    "flex h-8 flex-1 items-center justify-center rounded-lg border bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 pointer-coarse:h-10 [&_svg]:size-4",
    danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-secondary hover:text-primary",
  );
  return href ? (
    // "Edit" opens the ad tool in a new tab, filled in with this ad.
    <a href={href} target="_blank" rel="noopener" className={className} title={label} aria-label={label}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={className} title={label} aria-label={label}>
      {children}
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
