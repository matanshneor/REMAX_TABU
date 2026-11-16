"use client";

import { MegaphoneIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, useRecord, useSaveRecord } from "@/lib/data";
import type { Property } from "@/lib/types";
import { isOnWebsite } from "@/lib/website";
import { cn } from "@/lib/utils";

/**
 * Sharing a seller with every agent also puts it on the public site, as long as it can go there
 * (active, with at least one photo; the database refuses otherwise). When it can't, it's still
 * shared and the manager is told why it isn't on the site. The "העלאה לאתר" button stays for
 * doing it by hand, and for taking a seller off the site.
 */
function shareValues(p: Pick<Property, "status" | "image_paths" | "on_website">) {
  const why = p.status !== "active" ? "הנכס לא פעיל" : p.image_paths.length === 0 ? "אין לנכס תמונות" : null;
  return {
    values: { broadcast: true, ...(!why && !p.on_website ? { on_website: true } : {}) },
    message: why ? `הנכס שודר לכל הסוכנים. הוא לא עלה לאתר: ${why}` : "הנכס שודר לכל הסוכנים ועלה לאתר המשרד",
  };
}

/**
 * The manager's "שדר לכולם" button: shares this seller with every agent (they see it, with the
 * seller's details, can edit it, and get a bell notification), or stops sharing it. Shown only
 * to the manager; the database refuses anyone else.
 *
 * Exclusivity and sharing go together but never change each other silently: sharing a seller
 * that has no exclusivity asks whether to mark it exclusive too (and marking exclusivity asks
 * whether to share it: see ShareAfterExclusiveDialog).
 */
export function BroadcastButton({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  const [askExclusive, setAskExclusive] = useState(false);
  // Stopping the sharing of a seller that is on the site asks whether it should come off too.
  const [askTakeDown, setAskTakeDown] = useState(false);
  const save = useSaveRecord<Property>("properties", { silent: true });
  const on = property.broadcast;

  function apply() {
    const share = shareValues(property);
    save.mutate(
      { id: property.id, values: on ? { broadcast: false } : share.values },
      {
        onSuccess: () => {
          toast.success(on ? "השידור הופסק. הנכס חזר להיות רק אצל הסוכן המגייס" : share.message);
          setOpen(false);
          if (!on && !property.is_exclusive) setAskExclusive(true);
          if (on && isOnWebsite(property)) setAskTakeDown(true);
        },
      },
    );
  }

  function takeDown() {
    save.mutate(
      { id: property.id, values: { on_website: false } },
      {
        onSuccess: () => {
          toast.success("הנכס ירד מהאתר");
          setAskTakeDown(false);
        },
      },
    );
  }

  function markExclusive() {
    save.mutate(
      { id: property.id, values: { engagement: "exclusive" } },
      {
        onSuccess: () => {
          toast.success("הנכס סומן בבלעדיות. אפשר להוסיף תאריכי בלעדיות בכרטיס");
          setAskExclusive(false);
        },
      },
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(on && "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800")}
      >
        <MegaphoneIcon />
        {on ? "משודר לכולם · הפסקה" : "שדר לכולם"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{on ? "להפסיק לשדר את הנכס?" : "לשדר את הנכס לכל הסוכנים?"}</DialogTitle>
            <DialogDescription>
              {on
                ? "הנכס ייעלם מהרשימה של הסוכנים, ויישאר רק אצל הסוכן שגייס אותו ואצלך. אפשר לשדר אותו שוב בכל רגע."
                : "כל הסוכנים במשרד יראו את הנכס ואת פרטי המוכר, יוכלו לערוך אותו, ויקבלו התראה בפעמון. הנכס יעלה גם לאתר המשרד (אם הוא פעיל ויש לו תמונות). על הכרטיס יופיע מי גייס אותו."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button onClick={apply} disabled={save.isPending}>
              {on ? "הפסקת שידור" : "כן, שדר לכולם"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={askTakeDown} onOpenChange={setAskTakeDown}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>להוריד את הנכס מהאתר?</DialogTitle>
            <DialogDescription>
              השידור הופסק, אבל הנכס עדיין מופיע באתר המשרד. קישורים שנשלחו אליו יובילו לרשימת הנכסים. אפשר להעלות אותו שוב בכל רגע.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskTakeDown(false)}>
              לא, להשאיר באתר
            </Button>
            <Button onClick={takeDown} disabled={save.isPending}>
              כן, הורד מהאתר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={askExclusive} onOpenChange={setAskExclusive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לסמן את הנכס גם בבלעדיות?</DialogTitle>
            <DialogDescription>הנכס שודר לכולם, אבל הוא עדיין לא מסומן בבלעדיות.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskExclusive(false)}>
              לא, רק לשדר
            </Button>
            <Button onClick={markExclusive} disabled={save.isPending}>
              כן, סמן בבלעדיות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Right after the manager marks a seller exclusive (saving its card, or creating it): asks
 * whether to share it with every agent. "לא" leaves it with the recruiting agent.
 */
export function ShareAfterExclusiveDialog({ propertyId, onClose }: { propertyId: string | null; onClose: () => void }) {
  const save = useSaveRecord<Property>("properties", { silent: true });
  const { data: property } = useRecord<Property>("properties", propertyId);
  return (
    <Dialog open={!!propertyId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>סימנת את הנכס בבלעדיות</DialogTitle>
          <DialogDescription>
            לשדר את הנכס לכל הסוכנים במשרד? כולם יראו אותו ואת פרטי המוכר, יוכלו לערוך אותו, ויקבלו התראה בפעמון. הנכס יעלה גם לאתר המשרד (אם הוא פעיל ויש לו תמונות).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            לא, להשאיר אצל הסוכן
          </Button>
          <Button
            disabled={save.isPending || !property}
            onClick={() => {
              const share = shareValues(property!);
              save.mutate(
                { id: propertyId!, values: share.values },
                {
                  onSuccess: () => {
                    toast.success(share.message);
                    onClose();
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                },
              );
            }}
          >
            כן, שדר לכולם
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
