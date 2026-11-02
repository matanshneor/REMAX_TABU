"use client";

import { ImageIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, uploadFile, useSaveRecord, useSignedUrls } from "@/lib/data";
import type { Property } from "@/lib/types";
import { PropertyPlaceholder } from "./property-placeholder";

export const MEDIA_BUCKET = "property-media";

const MAX_SIDE = 2000;
const MAX_BYTES = 20 * 1024 * 1024;

/** Phone photos are large: shrink to 2000px JPEG before upload (keeps the original if the browser can't). */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** The photos among picked files; says so when something else was picked. */
function onlyImages(files: FileList | null): File[] {
  if (!files?.length) return [];
  const images = [...files].filter((f) => f.type.startsWith("image/"));
  if (images.length < files.length) toast.error("אפשר להעלות רק תמונות");
  return images;
}

/**
 * Shrinks and uploads photos into a folder of the property photos bucket (a property's id, or
 * listings/<id> for "מאגר יד2"). Each on its own: one failure doesn't lose the others.
 */
export async function uploadPropertyImages(folder: string, files: File[]) {
  const results = await Promise.allSettled(
    files.map(async (f) => {
      const small = await shrinkImage(f);
      if (small.size > MAX_BYTES) throw new Error("too big");
      return uploadFile(MEDIA_BUCKET, folder, small);
    }),
  );
  const paths = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  return { paths, failed: results.length - paths.length };
}

export function PropertyImages({ property, editable }: { property: Property; editable: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const save = useSaveRecord("properties", { silent: true });
  const { data: urls = {} } = useSignedUrls(MEDIA_BUCKET, property.image_paths);

  async function onFiles(files: FileList | null) {
    const images = onlyImages(files);
    if (!images.length) return;
    setUploading(true);
    try {
      const { paths, failed } = await uploadPropertyImages(property.id, images);
      if (paths.length) {
        await save.mutateAsync({ id: property.id, values: { image_paths: [...property.image_paths, ...paths] } });
        toast.success(paths.length > 1 ? `${paths.length} תמונות הועלו` : "התמונה הועלתה");
      }
      if (failed) toast.error(failed > 1 ? `${failed} תמונות לא הועלו — נסו שוב` : "תמונה אחת לא הועלתה — נסו שוב");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(path: string) {
    const before = property.image_paths;
    save.mutate(
      { id: property.id, values: { image_paths: before.filter((p) => p !== path) } },
      {
        onSuccess: () =>
          toast("התמונה הוסרה", {
            action: { label: "ביטול", onClick: () => save.mutate({ id: property.id, values: { image_paths: before } }) },
          }),
      },
    );
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
              className="absolute top-1.5 end-1.5 rounded-full bg-black/60 p-1 text-white transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
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

/** A new seller isn't saved yet: photos picked here wait and are uploaded with the first save. */
export function PendingImages({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        onChange([...files, ...onlyImages(e.target.files)]);
        e.target.value = "";
      }}
    />
  );

  if (!files.length) {
    return (
      <div className="relative mb-6 h-36 overflow-hidden rounded-xl">
        <PropertyPlaceholder label="אפשר להוסיף תמונות כבר עכשיו" />
        <Button size="sm" className="absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2" onClick={() => inputRef.current?.click()}>
          <ImagePlusIcon />
          הוסף תמונות
        </Button>
        {fileInput}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-4 gap-2">
      {previews.map((src, i) => (
        <div key={src} className={`group relative overflow-hidden rounded-lg bg-muted ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
          {/* Local previews of files that aren't uploaded yet. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="aspect-square size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            aria-label="הסר תמונה"
            className="absolute top-1.5 end-1.5 rounded-full bg-black/60 p-1 text-white transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <ImagePlusIcon className="size-5" />
        הוסף תמונות
      </button>
      {fileInput}
    </div>
  );
}
