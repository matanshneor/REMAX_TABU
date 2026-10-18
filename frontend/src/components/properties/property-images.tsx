"use client";

import { ImageIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, uploadFile, useSaveRecord, useSignedUrls } from "@/lib/data";
import type { Property } from "@/lib/types";
import { PropertyPlaceholder } from "./property-placeholder";

export const MEDIA_BUCKET = "property-media";

export function PropertyImages({ property, editable }: { property: Property; editable: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const save = useSaveRecord("properties", { silent: true });
  const { data: urls = {} } = useSignedUrls(MEDIA_BUCKET, property.image_paths);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const paths = await Promise.all([...files].map((f) => uploadFile(MEDIA_BUCKET, property.id, f)));
      await save.mutateAsync({ id: property.id, values: { image_paths: [...property.image_paths, ...paths] } });
      toast.success(paths.length > 1 ? `${paths.length} תמונות הועלו` : "התמונה הועלתה");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(path: string) {
    save.mutate({ id: property.id, values: { image_paths: property.image_paths.filter((p) => p !== path) } });
  }

  const fileInput = (
    <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
  );

  if (!property.image_paths.length) {
    return (
      <div className="relative mb-6 h-36 overflow-hidden rounded-xl">
        <PropertyPlaceholder label={editable ? "עדיין אין תמונות לנכס" : "אין תמונות לנכס"} />
        {editable && (
          <Button size="sm" className="absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImagePlusIcon />
            {uploading ? "מעלה…" : "הוסף תמונות"}
          </Button>
        )}
        {fileInput}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-4 gap-2">
      {property.image_paths.map((path, i) => (
        <div key={path} className={`group relative overflow-hidden rounded-lg bg-muted ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
          {urls[path] ? (
            // Signed Supabase URLs are short-lived; next/image optimization isn't useful here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[path]} alt="" className="aspect-square size-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-muted-foreground">
              <ImageIcon className="size-5" />
            </div>
          )}
          {editable && (
            <button
              onClick={() => removeImage(path)}
              aria-label="הסר תמונה"
              className="absolute top-1.5 end-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      {editable && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <ImagePlusIcon className="size-5" />
          {uploading ? "מעלה…" : "הוסף תמונות"}
        </button>
      )}
      {fileInput}
    </div>
  );
}
