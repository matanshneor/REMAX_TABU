"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, uploadFile, useSaveRecord, useTeam } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { OfficeAgent } from "@/lib/types";

const BUCKET = "agent-photos";
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * The agent's portrait for the ad tool: a cut-out photo (transparent background), saved as soon as it
 * is picked. It is printed on every ad, so the file lives in a public bucket.
 */
export function AgentPhoto({ row }: { row: OfficeAgent }) {
  const input = useRef<HTMLInputElement>(null);
  const save = useSaveRecord("office_agents", { silent: true });
  // The panel holds the row as it was when opened; the list has the saved photo.
  const current = useTeam().data?.find((a) => a.id === row.id) ?? row;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/webp"].includes(file.type)) {
      toast.error("יש לבחור תמונה בפורמט PNG או WebP עם רקע שקוף");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("התמונה גדולה מדי (עד 3MB)");
      return;
    }
    try {
      const path = await uploadFile(BUCKET, row.id, file);
      const url = createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      await save.mutateAsync({ id: row.id, values: { photo_url: url } });
      toast.success("התמונה נשמרה");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="mb-5 flex items-center gap-4 rounded-xl border bg-card p-3">
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
        {current.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.photo_url} alt="" className="size-full object-contain object-bottom" />
        ) : (
          <ImageIcon className="size-7 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">תמונה למודעות</p>
        <p className="mb-2 text-xs text-muted-foreground">
          תמונה ריבועית עם רקע שקוף (PNG או WebP). היא מודפסת בכל מודעה של הסוכן.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={() => input.current?.click()}>
            <UploadIcon />
            {current.photo_url ? "החלפת תמונה" : "העלאת תמונה"}
          </Button>
          {current.photo_url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={save.isPending}
              onClick={() => save.mutate({ id: row.id, values: { photo_url: null } })}
            >
              <Trash2Icon />
              הסרת תמונה
            </Button>
          )}
        </div>
        <input ref={input} type="file" accept="image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
      </div>
    </div>
  );
}
