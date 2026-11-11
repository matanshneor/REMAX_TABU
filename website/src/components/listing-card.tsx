import { ViewTransition } from "react";
import { photoName } from "@/lib/handoff";
import { formatPrice, formatRooms, type Listing, listingName, listingPlace } from "@/lib/listings";
import { ListingPhoto } from "./listing-photo";
import { ListingLink } from "./motion/listing-link";
import { NewTag } from "./ui";

/**
 * A listing in a list. Pressing it carries its photo into the listing's page (the photo keeps one
 * name on both, see lib/handoff.ts); when search results change, photos don't fly between places.
 */
export function ListingCard({ listing: l, eager, headingLevel = "h3" }: { listing: Listing; eager?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const facts = [
    l.rooms != null && `${formatRooms(l.rooms)} חדרים`,
    l.size_sqm != null && `${formatRooms(l.size_sqm)} מ״ר`,
  ].filter(Boolean);
  return (
    <article className="group">
      <ListingLink id={l.id} className="block">
        <div className="relative">
          <ViewTransition name={photoName(l.id)} share={{ default: "morph", filter: "none" }} default="none">
            <div className="relative aspect-[4/3] overflow-hidden bg-panel">
              <div className="absolute inset-0 transition-transform duration-(--dur-open) ease-out group-hover:scale-[1.04]">
                <ListingPhoto path={l.image_paths[0]} alt="" sizes="(min-width: 1024px) 600px, (min-width: 640px) 90vw, 100vw" eager={eager} />
              </div>
            </div>
          </ViewTransition>
          {l.is_new && <NewTag className="absolute start-4 top-4" />}
        </div>
        {/* The red line runs the width of the card while the pointer is on it. */}
        <div className="accent-line mt-6 group-hover:[--accent-w:100%] group-focus-within:[--accent-w:100%]">
          <Heading className="type-subtitle">{listingName(l)}</Heading>
          <p className="mt-1 text-ink-3">{listingPlace(l)}</p>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="type-subtitle">{formatPrice(l.current_price)}</p>
            {facts.length > 0 && <p className="text-sm text-ink-2">{facts.join(" · ")}</p>}
          </div>
        </div>
      </ListingLink>
    </article>
  );
}
