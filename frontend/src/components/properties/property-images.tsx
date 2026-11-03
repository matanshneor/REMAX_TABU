"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ImageIcon, ImagePlusIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, uploadFile, useSaveRecord, useSignedUrls } from "@/lib/data";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  // The order on screen: changes at once when a photo is dropped, then follows the saved card.
  const [order, setOrder] = useState(property.image_paths);
  const [synced, setSynced] = useState(property.image_paths);
  if (synced !== property.image_paths) {
    setSynced(property.image_paths);
    setOrder(property.image_paths);
  }
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(
    // Mouse: a small move starts the drag, so a click still works. Touch: hold a moment, so the page still scrolls.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(to, 0, ...next.splice(from, 1));
    const before = order;
    setOrder(next);
    save.mutate(
      { id: property.id, values: { image_paths: next } },
      {
        onSuccess: () => to === 0 && toast.success("התמונה הראשית הוחלפה"),
        onError: (e) => {
          setOrder(before);
          toast.error(errorMessage(e));
        },
      },
    );
  }

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
    const before = order;
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

  const grid = (
    <div className="grid grid-cols-4 gap-2">
      {order.map((path, i) => (
        <PhotoTile
          key={path}
          path={path}
          url={urls[path]}
          main={i === 0}
          editable={editable}
          hidden={dragging === path}
          onRemove={() => removeImage(path)}
        />
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

  if (!editable) return <div className="mb-6">{grid}</div>;

  return (
    <div className="mb-6">
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDragging(String(active.id))}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: "לחצו רווח כדי להרים את התמונה, חצים כדי להזיז, ורווח שוב כדי להניח." },
        }}
      >
        {grid}
        <DragOverlay>
          {dragging && urls[dragging] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[dragging]} alt="" className="aspect-square size-full rounded-lg object-cover shadow-xl ring-2 ring-primary" />
          )}
        </DragOverlay>
      </DndContext>
      {order.length > 1 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          גוררים תמונה כדי לשנות את הסדר (בטלפון: לוחצים עליה ממושך). התמונה הראשונה היא התמונה הראשית של הנכס.
        </p>
      )}
    </div>
  );
}

/** One photo: the first is big and marked "ראשית". When editable, it can be dragged onto another photo's place. */
function PhotoTile({
  path,
  url,
  main,
  editable,
  hidden,
  onRemove,
}: {
  path: string;
  url?: string;
  main: boolean;
  editable: boolean;
  hidden: boolean;
  onRemove: () => void;
}) {
  const drag = useDraggable({ id: path, disabled: !editable });
  const drop = useDroppable({ id: path, disabled: !editable });

  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      {...(editable ? { ...drag.attributes, ...drag.listeners, "aria-label": main ? "תמונה ראשית" : "תמונה" } : {})}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary",
        main && "col-span-2 row-span-2",
        editable && "cursor-grab active:cursor-grabbing",
        hidden && "opacity-30",
        drop.isOver && !hidden && "ring-2 ring-primary ring-offset-2",
      )}
    >
      {url ? (
        // Signed Supabase URLs are short-lived; next/image optimization isn't useful here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} className="aspect-square size-full object-cover select-none" />
      ) : (
        <div className="flex aspect-square items-center justify-center text-muted-foreground">
          <ImageIcon className="size-5" />
        </div>
      )}
      {main && (
        <span className="pointer-events-none absolute start-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          ראשית
        </span>
      )}
      {editable && (
        <button
          onClick={onRemove}
          // Not the start of a drag.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label="הסר תמונה"
          className="absolute top-1.5 end-1.5 rounded-full bg-black/60 p-1 text-white transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
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
