"use client";

import { MegaphoneIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveRecord } from "@/lib/data";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The manager's "שדר לכולם" button: shares this seller with every agent (they see it, with the
 * seller's details, can edit it, and get a bell notification), or stops sharing it. Shown only
 * to the manager; the database refuses anyone else.
 */
export function BroadcastButton({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  const save = useSaveRecord<Property>("properties", { silent: true });
  const on = property.broadcast;

  function apply() {
    save.mutate(
      { id: property.id, values: { broadcast: !on } },
      {
        onSuccess: () => {
          toast.success(on ? "השידור הופסק. הנכס חזר להיות רק אצל הסוכן המגייס" : "הנכס שודר לכל הסוכנים");
          setOpen(false);
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
                : "כל הסוכנים במשרד יראו את הנכס ואת פרטי המוכר, יוכלו לערוך אותו, ויקבלו התראה בפעמון. על הכרטיס יופיע מי גייס אותו."}
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
    </>
  );
}
