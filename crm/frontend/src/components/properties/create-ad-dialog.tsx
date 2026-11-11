"use client";

import { ImageIcon, MegaphoneIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adToolUrl } from "@/lib/ad-tool";
import { useSignedUrls } from "@/lib/data";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MEDIA_BUCKET } from "./property-images";

/** The ad has room for 3 photos: the first is the big one. */
const AD_PHOTOS = 3;

/** Opens the office's ad tool filled in with the property's details and the photos the agent picks. */
export function CreateAdButton({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MegaphoneIcon />
        יצירת מודעה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">{open && <CreateAdForm property={property} onDone={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </>
  );
}

function CreateAdForm({ property, onDone }: { property: Property; onDone: () => void }) {
  const { profile } = useAuth();
  const [picked, setPicked] = useState<string[]>([]);
  const { data: urls = {} } = useSignedUrls(MEDIA_BUCKET, property.image_paths);

  function toggle(path: string) {
    setPicked((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : prev.length < AD_PHOTOS ? [...prev, path] : prev,
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>יצירת מודעה לנכס</DialogTitle>
        <DialogDescription>
          כלי המודעות ייפתח עם פרטי הנכס והפרטים שלך. אפשר לשנות הכול שם לפני ההורדה.
        </DialogDescription>
      </DialogHeader>

      {property.image_paths.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            בחרו עד {AD_PHOTOS} תמונות למודעה, לפי הסדר. <span className="text-muted-foreground">הראשונה תהיה התמונה הגדולה.</span>
          </p>
          <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {property.image_paths.map((path) => {
              const order = picked.indexOf(path);
              const full = order < 0 && picked.length >= AD_PHOTOS;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => toggle(path)}
                  disabled={full}
                  aria-pressed={order >= 0}
                  aria-label={order >= 0 ? `תמונה ${order + 1} במודעה` : "בחירת תמונה"}
                  className={cn(
                    "relative overflow-hidden rounded-lg bg-muted outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
                    order >= 0 && "ring-3 ring-primary",
                    full && "opacity-40",
                  )}
                >
                  {urls[path] ? (
                    // Signed Supabase URLs are short-lived; next/image optimization isn't useful here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[path]} alt="" className="aspect-square size-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  {order >= 0 && (
                    <span className="absolute top-1.5 start-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">לנכס אין תמונות ב-CRM. אפשר לבחור תמונות מהמחשב או מהטלפון בתוך כלי המודעות.</p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button
          onClick={() => {
            const images = picked.map((path) => urls[path]).filter(Boolean);
            window.open(adToolUrl(property, profile?.phone, images), "_blank", "noopener");
            onDone();
          }}
        >
          <MegaphoneIcon />
          {picked.length > 1 ? `פתח בכלי המודעות (${picked.length} תמונות)` : picked.length ? "פתח בכלי המודעות (תמונה אחת)" : "פתח בכלי המודעות"}
        </Button>
      </DialogFooter>
    </>
  );
}
