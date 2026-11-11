"use client";

import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveRecord } from "@/lib/data";
import type { Property } from "@/lib/types";
import { isOnWebsite } from "@/lib/website";

/**
 * The manager's button: puts this property on the public site, or takes it off. Shown only to
 * the manager (the database refuses anyone else). A property goes up only when it is active and
 * has a photo; otherwise the dialog says what is missing.
 */
export function WebsitePublishButton({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  const save = useSaveRecord<Property>("properties", { silent: true });
  const on = isOnWebsite(property);
  const blocked =
    property.status !== "active"
      ? "אפשר להעלות לאתר רק נכס פעיל."
      : property.image_paths.length === 0
        ? "אי אפשר להעלות לאתר נכס בלי תמונות. מוסיפים לפחות תמונה אחת, ואז מעלים."
        : null;

  function apply() {
    save.mutate(
      { id: property.id, values: { on_website: !on } },
      {
        onSuccess: () => {
          toast.success(on ? "הנכס ירד מהאתר" : "הנכס עלה לאתר");
          setOpen(false);
        },
      },
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <GlobeIcon />
        {on ? "הורדה מהאתר" : "העלאה לאתר"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{on ? "להוריד את הנכס מהאתר?" : "להעלות את הנכס לאתר?"}</DialogTitle>
            <DialogDescription>
              {on
                ? "הנכס יפסיק להופיע באתר, וקישורים שנשלחו אליו יובילו לרשימת הנכסים. אפשר להעלות אותו שוב בכל רגע."
                : (blocked ??
                  "הנכס יופיע באתר לכל מי שנכנס: הכתובת, המחיר, התמונות והתיאור, עם פרטי הקשר של הסוכן שלו. פרטי המוכר לא מופיעים.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {!on && blocked ? "סגירה" : "ביטול"}
            </Button>
            {(on || !blocked) && (
              <Button onClick={apply} disabled={save.isPending}>
                {on ? "הורדה מהאתר" : "העלאה לאתר"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
