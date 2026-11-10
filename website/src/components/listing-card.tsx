import Link from "next/link";
import { formatPrice, formatRooms, type Listing, listingName, listingPlace } from "@/lib/listings";
import { ListingPhoto } from "./listing-photo";
import { NewTag } from "./ui";

export function ListingCard({ listing: l, priority, headingLevel = "h3" }: { listing: Listing; priority?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const name = listingName(l);
  const facts = [
    l.rooms != null && `${formatRooms(l.rooms)} חדרים`,
    l.size_sqm != null && `${formatRooms(l.size_sqm)} מ״ר`,
  ].filter(Boolean);
  return (
    <article className="group">
      <Link href={`/properties/${l.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-panel">
          <ListingPhoto
            path={l.image_paths[0]}
            alt=""
            sizes="(min-width: 1024px) 600px, (min-width: 640px) 90vw, 100vw"
            priority={priority}
            className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
          {l.is_new && <NewTag className="absolute start-4 top-4" />}
        </div>
        <div className="accent-line mt-6">
          <Heading className="font-serif text-2xl font-light leading-snug group-hover:underline group-hover:decoration-1 group-hover:underline-offset-8 sm:text-[1.75rem]">
            {name}
          </Heading>
          <p className="mt-1 text-ink-3">{listingPlace(l)}</p>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="font-serif text-2xl font-light">{formatPrice(l.current_price)}</p>
            {facts.length > 0 && <p className="text-sm text-ink-2">{facts.join(" · ")}</p>}
          </div>
        </div>
      </Link>
    </article>
  );
}
