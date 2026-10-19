"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types";
import { openWhatsApp, propertyMessage, toWhatsAppNumber } from "@/lib/whatsapp";

/** Send a ready-made property summary on WhatsApp — to a buyer from the CRM or any contact. */
export function ShareWhatsAppButton({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="text-[#128C7E] hover:text-[#075E54]" onClick={() => setOpen(true)}>
        <WhatsAppIcon />
        שליחת הנכס בוואטסאפ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">{open && <ShareForm property={property} onDone={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </>
  );
}

function ShareForm({ property, onDone }: { property: Property; onDone: () => void }) {
  const [buyerId, setBuyerId] = useState("");
  const [text, setText] = useState(() => propertyMessage(property));

  const { data: buyers = [] } = useQuery({
    queryKey: ["buyers", "whatsapp-options"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("buyers")
        .select("id, full_name, phone")
        .not("phone", "is", null)
        .order("full_name");
      if (error) throw error;
      return data.filter((b) => toWhatsAppNumber(b.phone));
    },
  });

  const buyer = buyers.find((b) => b.id === buyerId);

  return (
    <>
      <DialogHeader>
        <DialogTitle>שליחת הנכס בוואטסאפ</DialogTitle>
        <DialogDescription>ההודעה לא כוללת מספר דירה ופרטי בעלים. אפשר לערוך אותה לפני השליחה.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-to" className="text-xs text-muted-foreground">
            למי לשלוח?
          </Label>
          <NativeSelect
            id="share-to"
            value={buyerId}
            onChange={(e) => {
              const next = buyers.find((b) => b.id === e.target.value);
              setBuyerId(e.target.value);
              setText(propertyMessage(property, next?.full_name));
            }}
          >
            <option value="">אבחר איש קשר בוואטסאפ</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full_name} · {b.phone}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-text" className="text-xs text-muted-foreground">
            ההודעה
          </Label>
          <Textarea id="share-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button
          className="bg-[#25D366] text-white hover:bg-[#1fb958]"
          onClick={() => {
            openWhatsApp(buyer?.phone, text);
            onDone();
          }}
        >
          <WhatsAppIcon />
          {buyer ? `פתח שיחה עם ${buyer.full_name.split(" ")[0]}` : "פתח בוואטסאפ"}
        </Button>
      </DialogFooter>
    </>
  );
}
