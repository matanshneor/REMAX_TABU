"use client";

import { useQueryClient } from "@tanstack/react-query";
import { HandshakeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/crm/panel";
import { Money } from "@/components/crm/money";
import { CurrencyInput } from "@/components/form/currency-input";
import { RelationSelect } from "@/components/form/relation-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, useAgents, useCommissionRates } from "@/lib/data";
import { toDateInput } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Deal } from "@/lib/types";

/** Record a closed deal (or edit one). Admin only — RLS rejects anyone else. */
export function DealDialog({
  open,
  onOpenChange,
  deal,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this deal; omit to create a new one. */
  deal?: Deal | null;
  /** Starting values for a new deal (e.g. from a buyer who just bought through us). */
  prefill?: DealPrefill;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && <DealForm deal={deal ?? null} prefill={prefill} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export type DealPrefill = Partial<Pick<Deal, "buyer_id" | "agent_id" | "property_id" | "notes">>;

function DealForm({ deal, prefill, onDone }: { deal: Deal | null; prefill?: DealPrefill; onDone: () => void }) {
  const qc = useQueryClient();
  const { data: agents = [] } = useAgents();
  const { data: rates } = useCommissionRates();
  const [agentId, setAgentId] = useState(deal?.agent_id ?? prefill?.agent_id ?? "");
  const [commission, setCommission] = useState(deal ? String(Math.round(Number(deal.commission_amount))) : "");
  const [percentInput, setPercent] = useState(deal ? String(Number(deal.agent_percent)) : "");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [closedOn, setClosedOn] = useState(deal?.closed_on ?? toDateInput(new Date()));
  const [dealPrice, setDealPrice] = useState(deal?.deal_price != null ? String(deal.deal_price) : "");
  const [propertyId, setPropertyId] = useState(deal?.property_id ?? prefill?.property_id ?? "");
  const [buyerId, setBuyerId] = useState(deal?.buyer_id ?? prefill?.buyer_id ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? prefill?.notes ?? "");
  const [pending, setPending] = useState(false);

  const agent = agents.find((a) => a.id === agentId);
  const defaultPercent = rates?.get(agentId) ?? null;
  // A prefilled agent shows their fixed percentage (once the rates arrive) until it's edited.
  const percent = percentInput === "" && !deal && defaultPercent != null ? String(defaultPercent) : percentInput;
  const amount = Number(commission) || 0;
  const pct = Number(percent) || 0;
  const agentShare = Math.round(amount * pct) / 100;

  function pickAgent(id: string) {
    setAgentId(id);
    // Pre-fill the agent's fixed percentage (still editable for this deal).
    const rate = rates?.get(id);
    if (rate != null) setPercent(String(rate));
    setSaveAsDefault(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agentId) return toast.error("יש לבחור סוכן");
    if (amount <= 0) return toast.error("יש להזין את סכום העמלה שנכנס למשרד");
    if (pct <= 0 || pct > 100) return toast.error("אחוז הסוכן צריך להיות בין 1 ל-100");

    setPending(true);
    const supabase = createClient();
    const values = {
      agent_id: agentId,
      commission_amount: amount,
      agent_percent: pct,
      closed_on: closedOn,
      deal_price: dealPrice ? Number(dealPrice) : null,
      property_id: propertyId || null,
      buyer_id: buyerId || null,
      notes: notes.trim() || null,
    };
    const { error } = deal
      ? await supabase.from("deals").update(values).eq("id", deal.id)
      : await supabase.from("deals").insert(values);
    const rateError =
      !error && saveAsDefault
        ? (await supabase.from("profiles").update({ commission_split: pct }).eq("id", agentId)).error
        : null;
    setPending(false);
    if (error) return toast.error(errorMessage(error));
    if (rateError) toast.error(`העסקה נשמרה, אבל האחוז הקבוע לא עודכן: ${errorMessage(rateError)}`);

    for (const key of ["deals", "financial_transactions", "profiles"]) qc.invalidateQueries({ queryKey: [key] });
    toast.success(deal ? "העסקה עודכנה" : "העסקה נרשמה — ההכנסה והתשלום לסוכן נוספו להנהלת החשבונות");
    onDone();
  }

  async function remove() {
    if (!deal) return;
    const { error } = await createClient().from("deals").delete().eq("id", deal.id);
    if (error) return toast.error(errorMessage(error));
    for (const key of ["deals", "financial_transactions"]) qc.invalidateQueries({ queryKey: [key] });
    toast.success("העסקה נמחקה, יחד עם ההכנסה והתשלום שנרשמו ממנה");
    onDone();
  }

  return (
    <form onSubmit={submit} className="contents">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-normal">
          <HandshakeIcon className="size-5 text-primary" />
          {deal ? "עריכת עסקה" : "עסקה שנסגרה"}
        </DialogTitle>
        <DialogDescription>
          ההכנסה והתשלום לסוכן נרשמים אוטומטית בהנהלת החשבונות, ומתעדכנים יחד עם העסקה.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field label="סוכן" htmlFor="deal-agent">
          <NativeSelect id="deal-agent" value={agentId} onChange={(e) => pickAgent(e.target.value)} required>
            <option value="">בחר סוכן…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || a.email}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="תאריך סגירה" htmlFor="deal-date">
          <Input id="deal-date" type="date" value={closedOn} onChange={(e) => setClosedOn(e.target.value)} required />
        </Field>

        <Field label="כמה כסף נכנס למשרד (עמלה)" htmlFor="deal-commission">
          <CurrencyInput id="deal-commission" value={commission} onChange={setCommission} required />
        </Field>
        <Field label="אחוז הסוכן" htmlFor="deal-percent">
          <div className="relative">
            <Input
              id="deal-percent"
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="pe-7"
              required
            />
            <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          {agent && defaultPercent !== pct && pct > 0 && (
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={saveAsDefault} onCheckedChange={(c) => setSaveAsDefault(Boolean(c))} />
              לשמור {pct}% כאחוז הקבוע של {agent.full_name.split(" ")[0]} (במקום {defaultPercent}%)
            </label>
          )}
        </Field>

        {/* Live split so the admin sees exactly what gets recorded */}
        <div className="col-span-2 grid grid-cols-3 gap-2 rounded-xl border bg-secondary/40 p-3 text-center">
          <Split label="עמלה למשרד" value={amount} />
          <Split label={`לסוכן (${pct || 0}%)`} value={agentShare} tone="text-primary" />
          <Split label="נשאר למשרד" value={amount - agentShare} tone="text-emerald-700" />
        </div>

        <Field label="מחיר העסקה (לא חובה)" htmlFor="deal-price">
          <CurrencyInput id="deal-price" value={dealPrice} onChange={setDealPrice} />
        </Field>
        <Field label="נכס" htmlFor="deal-property">
          <RelationSelect id="deal-property" kind="property" value={propertyId} onChange={setPropertyId} />
        </Field>
        <Field label="קונה" htmlFor="deal-buyer">
          <RelationSelect id="deal-buyer" kind="buyer" value={buyerId} onChange={setBuyerId} />
        </Field>
        <Field label="הערות" htmlFor="deal-notes" className="col-span-2">
          <Textarea id="deal-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <DialogFooter className="items-center">
        {deal && (
          <div className="me-auto">
            <ConfirmDelete onConfirm={remove} label="מחק עסקה" />
          </div>
        )}
        <Button type="button" variant="outline" onClick={onDone}>
          ביטול
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "שומר…" : deal ? "שמור שינויים" : "רשום עסקה"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Split({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money value={value} className={`font-display text-xl ${tone}`} />
    </div>
  );
}
