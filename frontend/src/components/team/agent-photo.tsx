"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cutOutPortrait, warmUpCutOut } from "@/lib/cut-out-portrait";
import { errorMessage, uploadFile, useSaveRecord, useTeam } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { OfficeAgent } from "@/lib/types";

const BUCKET = "agent-photos";
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Takes any ordinary photo, removes its background (in the browser), uploads the cut-out portrait to
 * the public bucket and returns its public URL (null after showing why not).
 */
async function uploadPhoto(folder: string, file: File): Promise<string | null> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast.error("יש לבחור תמונה בפורמט JPG, PNG או WebP");
    return null;
  }
  if (file.size > MAX_BYTES) {
    toast.error("התמונה גדולה מדי (עד 15MB)");
    return null;
  }
  let cutOut: Blob;
  try {
    cutOut = await cutOutPortrait(file);
  } catch (error) {
    toast.error(error instanceof Error && error.message.includes("אדם") ? error.message : "הסרת הרקע נכשלה. אפשר לנסות תמונה אחרת");
    return null;
  }
  const path = await uploadFile(BUCKET, folder, new File([cutOut], "portrait.png", { type: "image/png" }));
  return createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * The agent's portrait for the ad tool: a cut-out photo (transparent background). It is printed on
 * every ad, so the file lives in a public bucket.
 */
function PhotoBox({
  url,
  busy,
  onPick,
  onRemove,
}: {
  url: string | null;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  // Start fetching the background-removal model while the admin picks the file.
  useEffect(() => warmUpCutOut(), []);
  return (
    <div className="mb-5 flex items-center gap-4 rounded-xl border bg-card p-3">
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-contain object-bottom" />
        ) : (
          <ImageIcon className="size-7 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">תמונה למודעות</p>
        <p className="mb-2 text-xs text-muted-foreground">
          כל תמונה רגילה של הסוכן (JPG, PNG או WebP), עדיף עם הפנים והכתפיים ברורים. הרקע מוסר אוטומטית, וזה לוקח כמה שניות. התמונה מודפסת בכל מודעה של הסוכן.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <UploadIcon />
            {busy ? "מסיר רקע…" : url ? "החלפת תמונה" : "העלאת תמונה"}
          </Button>
          {url && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}>
              <Trash2Icon />
              הסרת תמונה
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
      </div>
    </div>
  );
}

/** In an existing agent's panel: the photo is saved as soon as it is picked. */
export function AgentPhoto({ row }: { row: OfficeAgent }) {
  const save = useSaveRecord("office_agents", { silent: true });
  const [uploading, setUploading] = useState(false);
  // The panel holds the row as it was when opened; the list has the saved photo.
  const current = useTeam().data?.find((a) => a.id === row.id) ?? row;

  async function pick(file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto(row.id, file);
      if (!url) return;
      await save.mutateAsync({ id: row.id, values: { photo_url: url } });
      toast.success("התמונה נשמרה");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <PhotoBox
      url={current.photo_url}
      busy={uploading || save.isPending}
      onPick={pick}
      onRemove={() => save.mutate({ id: row.id, values: { photo_url: null } })}
    />
  );
}

/** In the "new agent" dialog: the photo is uploaded now and saved together with the agent. */
export function NewAgentPhoto({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);

  async function pick(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadPhoto("new", file);
      if (uploaded) onChange(uploaded);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  return <PhotoBox url={url} busy={uploading} onPick={pick} onRemove={() => onChange(null)} />;
}
