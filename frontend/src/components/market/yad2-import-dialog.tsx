"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/crm/money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";
import { formatILS } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { MarketListing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addressKey, type ImportedListing, parseYad2Plus, pastePieces, rowId } from "./yad2-import";

type Kind = "new" | "price" | "exists";
type Row = ImportedListing & { id: string; kind: Kind; existing?: MarketListing; sameBuilding?: boolean };

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** The pool listing this row is, if any: same address and the same phone, price, or flat (rooms and type). */
function findExisting(r: ImportedListing, atAddress: MarketListing[]): MarketListing | undefined {
  return atAddress.find(
    (l) =>
      (!!r.phone && digits(l.phone) === digits(r.phone)) ||
      (r.price != null && l.price === r.price) ||
      (r.rooms != null && l.rooms === r.rooms && (l.property_type ?? "") === r.type),
  );
}

const KIND: Record<Kind, { label: string; className: string }> = {
  new: { label: "חדש", className: "bg-emerald-50 text-emerald-900" },
  price: { label: "מחיר השתנה", className: "bg-amber-50 text-amber-900" },
  exists: { label: "כבר במערכת", className: "bg-muted text-muted-foreground" },
};

/** "ייבוא מיד 2 פלוס" (admin): paste the "גיוס נכסים חדשים" table, see what's new, add it to the pool. */
export function Yad2ImportDialog({
  open,
  onOpenChange,
  listings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        {open && <ImportForm listings={listings} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ listings, onDone }: { listings: MarketListing[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [parsed, setParsed] = useState<ImportedListing[] | null>(null);
  const [rentals, setRentals] = useState(0);
  const [sellerKeys, setSellerKeys] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [neighborhood, setNeighborhood] = useState("פסגת זאב");
  const [busy, setBusy] = useState(false);

  const rows = useMemo<Row[]>(() => {
    if (!parsed) return [];
    const byKey = new Map<string, MarketListing[]>();
    for (const l of listings) {
      const k = addressKey(l.street);
      byKey.set(k, [...(byKey.get(k) ?? []), l]);
    }
    return parsed.map((p) => {
      const id = rowId(p);
      const atAddress = byKey.get(p.key) ?? [];
      const existing = findExisting(p, atAddress);
      if (existing) {
        // A listing already moved to the sellers isn't touched; an open one takes the new price.
        const changed = p.price != null && existing.price !== p.price && existing.status !== "added";
        return { ...p, id, kind: changed ? "price" : "exists", existing };
      }
      // Another flat at an address already in the pool is new, but say so.
      return { ...p, id, kind: sellerKeys.has(p.key) ? "exists" : "new", sameBuilding: atAddress.length > 0 };
    });
  }, [parsed, listings, sellerKeys]);
  const picked = rows.filter((r) => r.kind !== "exists" && !skipped.has(r.id));
  const count = (k: Kind) => rows.filter((r) => r.kind === k).length;
  const adding = picked.filter((r) => r.kind === "new").length;
  const updating = picked.length - adding;

  async function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const all = parseYad2Plus(pastePieces(e.clipboardData.getData("text/html"), e.clipboardData.getData("text/plain")));
    if (!all.length) {
      toast.error("לא נמצאו נכסים בהדבקה. צריך לסמן את השורות בטבלה עצמה, כולל העמודה ״למכירה״, ולהעתיק שוב.");
      return;
    }
    // Pasting another page adds to what's already here.
    const sale = all.filter((r) => r.deal === "sale");
    setRentals((n) => n + all.length - sale.length);
    setParsed((prev) => {
      const have = new Set((prev ?? []).map(rowId));
      return [...(prev ?? []), ...sale.filter((r) => !have.has(rowId(r)))];
    });
    // Addresses already among the sellers count as "in the system" too.
    // (The sellers keep the house number apart from the street.)
    const { data } = await createClient().from("properties").select("street, house_number");
    setSellerKeys(new Set((data ?? []).map((p) => addressKey(`${p.street ?? ""} ${p.house_number ?? ""}`)).filter(Boolean)));
  }

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const today = new Date().toLocaleDateString("he-IL");
    try {
      const fresh = picked.filter((r) => r.kind === "new");
      if (fresh.length) {
        const { error } = await supabase.from("market_listings").insert(
          fresh.map((r) => ({
            source: "יד2",
            status: "new" as const,
            title: [r.type, r.rooms && `${r.rooms} חד׳`].filter(Boolean).join(" ") + `, ${r.street}`,
            property_type: r.type || null,
            city: r.city || null,
            neighborhood: neighborhood.trim() || null,
            street: r.street,
            rooms: r.rooms,
            size_sqm: r.sizeSqm,
            floor: r.floor,
            price: r.price,
            advertiser: r.contact,
            phone: r.phone,
            ...(r.listedAt && { listed_at: r.listedAt }),
            notes: [r.floor != null && r.totalFloors && `קומה ${r.floor} מתוך ${r.totalFloors}`, `נקלט מיד 2 פלוס ב-${today}`]
              .filter(Boolean)
              .join(" · "),
          })),
        );
        if (error) throw error;
      }
      for (const r of picked.filter((r) => r.kind === "price")) {
        const l = r.existing!;
        const line = `המחיר השתנה מ-${formatILS(l.price)} ל-${formatILS(r.price)} (${today})`;
        const { error } = await supabase
          .from("market_listings")
          .update({ price: r.price, notes: l.notes ? `${l.notes}\n${line}` : line })
          .eq("id", l.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["market_listings"] });
      toast.success(
        [adding && (adding === 1 ? "נכס חדש אחד נוסף למאגר" : `${adding} נכסים חדשים נוספו למאגר`), updating && `${updating} מחירים עודכנו`]
          .filter(Boolean)
          .join(" · "),
      );
      onDone();
    } catch (e) {
      // Part may have been saved: refresh, so pasting again shows those as "כבר במאגר".
      qc.invalidateQueries({ queryKey: ["market_listings"] });
      toast.error(`הייבוא לא הושלם (${errorMessage(e)}). אפשר להדביק שוב: מה שכבר נשמר יסומן ״כבר במאגר״.`, { duration: 10000 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-normal">
          <span className="rounded-md bg-yad2 px-1.5 py-px text-xs leading-snug font-extrabold text-foreground">יד2</span>
          ייבוא מיד 2 פלוס
        </DialogTitle>
        <DialogDescription render={<div />}>
          <ol className="mt-1 flex list-inside list-decimal flex-col gap-0.5">
            <li>ביד 2 פלוס, בדף ״גיוס נכסים חדשים״, מסמנים עם העכבר את כל השורות בטבלה.</li>
            <li>מעתיקים, לוחצים בתיבה למטה ומדביקים.</li>
            <li>אפשר להדביק כמה עמודים, אחד אחרי השני.</li>
          </ol>
        </DialogDescription>
      </DialogHeader>

      <textarea
        onPaste={onPaste}
        value=""
        onChange={() => {}}
        aria-label="הדבקת הטבלה מיד 2 פלוס"
        placeholder={parsed ? "מדביקים כאן עמוד נוסף" : "מדביקים כאן את הטבלה"}
        className={cn(
          "w-full resize-none rounded-xl border-2 border-dashed border-primary/30 bg-secondary/30 px-4 text-center text-base outline-none placeholder:font-semibold placeholder:text-primary focus-visible:border-primary",
          parsed ? "h-12 py-2.5" : "h-32 pt-12",
        )}
      />

      {parsed && (
        <>
          <div className="flex flex-wrap gap-1.5 text-sm">
            <span className="rounded-full border px-3 py-0.5">נמצאו {rows.length + rentals} נכסים</span>
            <span className="rounded-full bg-emerald-50 px-3 py-0.5 font-semibold text-emerald-900">{count("new")} חדשים</span>
            {count("price") > 0 && <span className="rounded-full bg-amber-50 px-3 py-0.5 text-amber-900">{count("price")} עם מחיר חדש</span>}
            {count("exists") > 0 && <span className="rounded-full border px-3 py-0.5 text-muted-foreground">{count("exists")} כבר במערכת</span>}
            {rentals > 0 && <span className="rounded-full border px-3 py-0.5 text-muted-foreground">{rentals} להשכרה · מדלגים</span>}
          </div>

          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            שכונה לנכסים החדשים
            <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-40" />
          </Label>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-8" />
                  <th className="px-2 py-2 text-start font-medium">כתובת</th>
                  <th className="px-2 py-2 text-start font-medium">פרטים</th>
                  <th className="px-2 py-2 text-start font-medium">מחיר</th>
                  <th className="px-2 py-2 text-start font-medium">איש קשר</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("border-t align-top", r.kind === "exists" && "text-muted-foreground")}>
                    <td className="px-2 py-2">
                      {r.kind !== "exists" && (
                        <Checkbox
                          checked={!skipped.has(r.id)}
                          onCheckedChange={(on) =>
                            setSkipped((s) => {
                              const next = new Set(s);
                              if (on) next.delete(r.id);
                              else next.add(r.id);
                              return next;
                            })
                          }
                          aria-label={`לכלול את ${r.street}`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {r.street}
                      <span className="block text-xs text-muted-foreground">{[r.city, r.type].filter(Boolean).join(" · ")}</span>
                      {r.sameBuilding && <span className="block text-xs text-amber-800">יש במאגר עוד דירה בכתובת הזו</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                      {[r.rooms && `${r.rooms} חד׳`, r.sizeSqm && `${r.sizeSqm} מ״ר`].filter(Boolean).join(" · ")}
                      {r.floor != null && (
                        <span className="block text-xs text-muted-foreground">
                          קומה {r.floor}
                          {r.totalFloors ? ` מתוך ${r.totalFloors}` : ""}
                        </span>
                      )}
                    </td>
                    <td className={cn("px-2 py-2 whitespace-nowrap tabular-nums", r.kind !== "exists" && "font-semibold text-primary")}>
                      <Money value={r.price} />
                      {r.kind === "price" && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          היה <Money value={r.existing!.price} />
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {r.contact ?? "—"}
                      {r.phone && (
                        <span dir="ltr" className="block text-end text-xs text-muted-foreground tabular-nums">
                          {r.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-end">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", KIND[r.kind].className)}>
                        {KIND[r.kind].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          ביטול
        </Button>
        <Button onClick={save} disabled={!picked.length || busy}>
          {!parsed
            ? "הוספה למאגר"
            : !picked.length
              ? "אין נכסים חדשים"
              : [adding && `הוספת ${adding === 1 ? "נכס אחד" : `${adding} נכסים`}`, updating && `עדכון ${updating === 1 ? "מחיר אחד" : `${updating} מחירים`}`]
                  .filter(Boolean)
                  .join(" ו")}
        </Button>
      </DialogFooter>
    </>
  );
}
