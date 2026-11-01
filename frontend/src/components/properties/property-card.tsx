import { ArrowDownIcon, ImageOffIcon } from "lucide-react";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatAddress, formatILS } from "@/lib/format";
import { PROPERTY_STATUS } from "@/lib/labels";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Money } from "@/components/crm/money";
import { ExclusivityPill } from "./exclusivity-pill";

const FEATURES: [keyof Property, string][] = [
  ["has_safe_room", "ממ״ד"],
  ["has_balcony", "מרפסת"],
  ["has_garden", "גינה"],
  ["has_elevator", "מעלית"],
  ["has_storage", "מחסן"],
  ["is_renovated", "משופץ"],
];

export function PropertyCard({
  property: p,
  imageUrl,
  agentName,
  sellerName,
  selected,
  onClick,
}: {
  property: Property;
  imageUrl?: string;
  agentName: string;
  sellerName?: string | null;
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
  if (p.parking_spots) features.push(p.parking_spots > 1 ? `${p.parking_spots} חניות` : "חניה");

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card text-start shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(15_26_46/0.05),0_18px_36px_-14px_rgb(15_26_46/0.25)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        selected && "ring-2 ring-primary",
        p.status !== "active" && "opacity-75",
      )}
    >
      {hasImages ? (
        <div className="relative aspect-[16/10] bg-muted">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
            {p.is_exclusive ? <ExclusivityPill end={p.exclusivity_end} onImage /> : <span />}
            {p.status !== "active" && <StatusBadge map={PROPERTY_STATUS} value={p.status} className="bg-white" />}
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
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
          {sellerName ? (
            <span className="truncate">
              מוכר: <span className="font-medium text-foreground">{sellerName}</span>
            </span>
          ) : (
            <span className="font-medium text-amber-700">חסר מוכר</span>
          )}
          <span className="shrink-0">{agentName}</span>
        </div>
      </div>
    </button>
  );
}
