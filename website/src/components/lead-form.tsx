"use client";

import { CheckIcon } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { WhatsAppIcon } from "./icons";
import { buttonClass, cn } from "./ui";

type Errors = Partial<Record<"name" | "phone" | "message", string>>;

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

function phoneOk(raw: string): boolean {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00972")) d = `0${d.slice(5)}`;
  else if (d.startsWith("972")) d = `0${d.slice(3)}`;
  return /^0\d{8,9}$/.test(d);
}

function validate(name: string, phone: string, message: string): Errors {
  const e: Errors = {};
  if (name.trim().length < 2) e.name = "צריך למלא שם";
  if (!phone.trim()) e.phone = "צריך למלא טלפון";
  else if (!phoneOk(phone)) e.phone = "מספר הטלפון לא תקין. לדוגמה: 052-123-4567";
  if (message.length > 2000) e.message = "ההודעה ארוכה מדי (עד 2,000 תווים)";
  return e;
}

/**
 * Name, phone and message to the agent. The lead goes to the CRM server (POST /public/leads), which
 * saves it as the agent's buyer and tells the agent. `website` is a trap field people never see.
 */
export function LeadForm({
  propertyId,
  defaultMessage = "",
  whatsappHref,
  agentFirstName,
  submitLabel = "שליחה",
  messageLabel = "הודעה (לא חובה)",
}: {
  propertyId?: string;
  defaultMessage?: string;
  whatsappHref?: string | null;
  agentFirstName: string;
  submitLabel?: string;
  messageLabel?: string;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failure, setFailure] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const phone = String(data.get("phone") ?? "");
    const message = String(data.get("message") ?? "");
    const found = validate(name, phone, message);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setState("sending");
    try {
      const res = await fetch(`${API_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message, property_id: propertyId ?? null, website: String(data.get("website") ?? "") }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      const body = await res.json().catch(() => null);
      setFailure(
        res.status === 429 && typeof body?.detail === "string"
          ? body.detail
          : "לא הצלחנו לשלוח את הפנייה. אפשר לנסות שוב, להתקשר או לשלוח וואטסאפ.",
      );
      setState("failed");
    } catch {
      setFailure("אין חיבור לאינטרנט, או שהשרת לא זמין. אפשר לנסות שוב, להתקשר או לשלוח וואטסאפ.");
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-line-strong p-6">
        <p className="rise type-subtitle flex items-center gap-3">
          <CheckIcon className="size-6 shrink-0 text-ink-2" aria-hidden="true" />
          תודה, הפנייה נשלחה
        </p>
        <p className="rise mt-2 text-ink-2" style={{ animationDelay: "80ms" }}>
          {agentFirstName} יחזור אליכם בהקדם.
        </p>
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener" className={buttonClass("red", "rise mt-6 w-full")} style={{ animationDelay: "160ms" }}>
            <WhatsAppIcon className="size-5" />
            לתשובה מהירה בוואטסאפ
          </a>
        )}
      </div>
    );
  }

  const field =
    "mt-2 block w-full border bg-night px-4 text-ink transition-colors duration-(--dur-ui) placeholder:text-ink-3/70 focus:border-ink-2 focus:outline-none focus-visible:outline-2";
  return (
    <form ref={form} onSubmit={submit} noValidate className="space-y-5" aria-describedby={`${id}-privacy`}>
      <div>
        <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink-2">
          שם
        </label>
        <input
          id={`${id}-name`}
          name="name"
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          className={cn(field, "h-12", errors.name ? "border-red" : "border-line-strong")}
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="mt-1.5 text-sm text-ink-2">
            <span aria-hidden="true" className="me-1.5 inline-block size-1.5 bg-red align-middle" />
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="text-sm font-medium text-ink-2">
          טלפון
        </label>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          maxLength={30}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
          className={cn(field, "h-12 text-right", errors.phone ? "border-red" : "border-line-strong")}
        />
        {errors.phone && (
          <p id={`${id}-phone-error`} className="mt-1.5 text-sm text-ink-2">
            <span aria-hidden="true" className="me-1.5 inline-block size-1.5 bg-red align-middle" />
            {errors.phone}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="text-sm font-medium text-ink-2">
          {messageLabel}
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={4}
          maxLength={2000}
          defaultValue={defaultMessage}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? `${id}-message-error` : undefined}
          className={cn(field, "resize-y py-3", errors.message ? "border-red" : "border-line-strong")}
        />
        {errors.message && (
          <p id={`${id}-message-error`} className="mt-1.5 text-sm text-ink-2">
            {errors.message}
          </p>
        )}
      </div>
      {/* Trap for bots: hidden from people and from screen readers. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>אתר</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === "failed" && (
        <p role="alert" className="border-s-2 border-red bg-panel px-4 py-3 text-ink-2">
          {failure}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className={buttonClass("red", "w-full disabled:opacity-70")}>
        {state === "sending" ? "שולחים…" : submitLabel}
      </button>
      <p id={`${id}-privacy`} className="text-xs leading-relaxed text-ink-3">
        הפרטים מגיעים רק ל{agentFirstName}, ומשמשים רק כדי לחזור אליכם.
      </p>
    </form>
  );
}
