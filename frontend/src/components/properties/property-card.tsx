import { ArrowDownIcon, ImageOffIcon, PhoneIcon, UserRoundIcon } from "lucide-react";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatAddress, formatILS } from "@/lib/format";
import { PROPERTY_ENGAGEMENT, PROPERTY_STATUS } from "@/lib/labels";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Money } from "@/components/crm/money";
import { ExclusivityPill } from "./exclusivity-pill";

const FEATURES: [keyof Property, string][] = [
  ["has_safe_room", "ממ״ד"],
  ["has_balcony", "מרפסת"],
  ["has_garden", "גינה"],
  ["has_rental_unit", "יחידת דיור"],
  ["has_elevator", "מעלית"],
  ["has_storage", "מחסן"],
  ["is_renovated", "משופץ"],
  ["eviction_immediate", "פינוי מיידי"],
];

export function PropertyCard({
  property: p,
  imageUrl,
  agentName,
  sellerName,
  sellerPhone,
  selected,
  onClick,
}: {
  property: Property;
  imageUrl?: string;
  agentName: string;
  sellerName?: string | null;
  /** Shown as call and WhatsApp buttons at the bottom of the card. */
  sellerPhone?: string | null;
  selected?: boolean;
  onClick: () => void;
}) {
  const hasImages = p.image_paths.length > 0;
  const dropped = p.previous_price != null && p.current_price != null && p.current_price < p.previous_price;
  const specs = [
    p.rooms && `${p.rooms} חד׳`,
    p.size_sqm && `${p.size_sqm} מ״ר`,
    p.floor != null && (p.total_floors ? `קומה ${p.floor}/${p.total_floors}` : `קומה ${p.floor}`),
  ].filter(Boolean);
  const features = FEATURES.filter(([k]) => p[k]).map(([, label]) => label);
  // Not offered to buyers yet: say so on the card.
  const recruiting = p.engagement === "recruiting" && (
    <StatusBadge map={PROPERTY_ENGAGEMENT} value={p.engagement} className="bg-white" />
  );
  if (p.parking_spots) features.push(p.parking_spots > 1 ? `${p.parking_spots} חניות` : "חניה");

  return (
    // A card with its own buttons can't itself be a <button>: a full-size button under the content
    // opens the seller; the call and WhatsApp buttons sit above it.
    <div
      className={cn(
        "group relative flex flex-col has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-ring overflow-hidden rounded-xl border bg-card text-start shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        selected && "ring-2 ring-primary",
        p.status !== "active" && "opacity-75",
      )}
    >
      <button type="button" onClick={onClick} aria-label={`פתיחת ${formatAddress(p) || "המוכר"}`} className="absolute inset-0 z-0 outline-none" />
      <div className="pointer-events-none relative flex flex-1 flex-col">
      {hasImages ? (
        <div className="relative aspect-[16/10] bg-muted">
          {imageUrl && (
            // Absolute: a portrait photo can't stretch the frame taller than 16:10.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
            {p.is_exclusive ? <ExclusivityPill end={p.exclusivity_end} onImage /> : <span />}
            <span className="flex gap-1">
              {recruiting}
              {p.status !== "active" && <StatusBadge map={PROPERTY_STATUS} value={p.status} className="bg-white" />}
            </span>
          </div>
        </div>
      ) : (
        // No photos yet: a thin strip instead of a big empty picture, so the details come first.
        <div className="flex items-center justify-between gap-2 border-b bg-secondary/50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageOffIcon className="size-3.5" />
            אין תמונות
          </span>
          <span className="flex gap-1">
            {p.is_exclusive && <ExclusivityPill end={p.exclusivity_end} />}
            {recruiting}
            {p.status !== "active" && <StatusBadge map={PROPERTY_STATUS} value={p.status} className="bg-white" />}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <Money value={p.current_price} className="font-display text-xl text-primary" />
          {dropped && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-700">
              <ArrowDownIcon className="size-3" />
              <s className="tabular-nums text-muted-foreground">{formatILS(p.previous_price)}</s>
            </span>
          )}
        </div>
        <div>
          <p className="truncate font-medium">{formatAddress(p)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[p.neighborhood, p.city].filter(Boolean).join(", ")}
            {p.property_type && ` · ${p.property_type}`}
          </p>
        </div>
        {specs.length > 0 && <p className="text-sm tabular-nums">{specs.join(" · ")}</p>}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {features.map((f) => (
              <span key={f} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
        {/* The agent on a line of its own, so the seller's name below has the room to show in full. */}
        <p className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
          <UserRoundIcon className="size-3.5 shrink-0" />
          <span className="truncate">סוכן: {agentName}</span>
        </p>
        <div className="flex items-center gap-2 border-t pt-2 text-sm">
          {sellerName ? (
            <span className="min-w-0 leading-snug">
              <span className="text-xs text-muted-foreground">מוכר: </span>
              <span className="font-medium">{sellerName}</span>
            </span>
          ) : (
            <span className="min-w-0 flex-1 text-xs font-medium text-amber-700">חסר מוכר</span>
          )}
          {sellerPhone && (
            <span className="pointer-events-auto relative z-10 flex shrink-0 gap-1">
              <WhatsAppButton phone={sellerPhone} size="icon-sm" solid label={`וואטסאפ ל${sellerName || "מוכר"}`} />
              <Button
                variant="outline"
                size="icon-sm"
                render={<a href={`tel:${sellerPhone}`} />}
                nativeButton={false}
                aria-label={`חיוג ל${sellerName || "מוכר"}`}
                title={`חיוג ל${sellerName || "מוכר"} · ${sellerPhone}`}
              >
                <PhoneIcon />
              </Button>
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
