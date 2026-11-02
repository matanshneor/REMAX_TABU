"use client";

import { NavigationIcon, PhoneIcon } from "lucide-react";
import { WhatsAppIcon } from "@/components/crm/whatsapp-button";
import { formatAddress } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";

type Linked = {
  buyer?: { full_name: string; phone: string | null } | null;
  property?: {
    street: string | null;
    house_number: string | null;
    apartment_number?: string | null;
    city: string;
    seller?: { owner_name: string | null; owner_phone: string | null } | null;
  } | null;
};

const iconLink =
  "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

/**
 * One-tap actions on a linked task: call or WhatsApp the buyer (or the seller), and navigate
 * to the property with Waze. Clicks don't open the task.
 */
export function TaskContactActions({ buyer, property }: Linked) {
  const phone = buyer?.phone ?? property?.seller?.owner_phone ?? null;
  const who = buyer?.full_name ?? property?.seller?.owner_name ?? "";
  const wa = phone ? whatsappUrl(phone) : null;
  const address = property && property.street ? `${formatAddress({ ...property, apartment_number: null })}, ${property.city}` : null;
  if (!phone && !address) return null;

  return (
    <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center">
      {phone && (
        <a href={`tel:${phone}`} className={iconLink} title={`חיוג ל${who} · ${phone}`} aria-label={`חיוג ל${who}`}>
          <PhoneIcon className="size-4" />
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener" className={`${iconLink} hover:text-[#128C7E]`} title={`וואטסאפ ל${who}`} aria-label={`וואטסאפ ל${who}`}>
          <WhatsAppIcon />
        </a>
      )}
      {address && (
        <a
          href={`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`}
          target="_blank"
          rel="noopener"
          className={iconLink}
          title={`ניווט ב-Waze: ${address}`}
          aria-label="ניווט ב-Waze"
        >
          <NavigationIcon className="size-4" />
        </a>
      )}
    </span>
  );
}
