import { ArrowLeftIcon } from "lucide-react";
import { ViewTransition } from "react";
import { photoName } from "@/lib/handoff";
import { cardFacts, formatPrice, type Listing, listingName, listingPlace } from "@/lib/listings";
import { ListingPhoto } from "./listing-photo";
import { ListingLink } from "./motion/listing-link";
import { NewTag } from "./ui";

/** "7 חדרים", "250 מ״ר", "גינה 380 מ״ר", "קומה 6 מתוך 7", "ממ״ד". */
function factText(f: { label: string; value: string }): string {
  if (f.label === "חדרים") return `${f.value} חדרים`;
  if (f.label === "שטח") return f.value;
  return f.value === "יש" ? f.label : `${f.label} ${f.value}`;
}

/**
 * A listing in a list: the photo is the card, and the place, name, main facts and price lie over
 * its dark lower part (the owner's choice, 12.11.2026). Pressing it carries the photo into the
 * listing's page (the photo keeps one name on both, see lib/handoff.ts); when search results
 * change, photos don't fly between places.
 */
export function ListingCard({ listing: l, eager, headingLevel = "h3" }: { listing: Listing; eager?: boolean; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const facts = cardFacts(l).map(factText);
  return (
    <article className="group">
      <ListingLink id={l.id} className="relative block aspect-[3/4] overflow-hidden bg-panel">
        <ViewTransition name={photoName(l.id)} share={{ default: "morph", filter: "none" }} default="none">
          <div className="absolute inset-0 overflow-hidden bg-panel">
            <div className="absolute inset-0 transition-transform duration-(--dur-open) ease-out group-hover:scale-[1.04]">
              <ListingPhoto path={l.image_paths[0]} alt="" sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw" eager={eager} />
            </div>
          </div>
        </ViewTransition>
        {/* Shade: the lower part of the photo goes dark, so the words read on any photo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(6,16,40,0.96)_0%,rgba(6,16,40,0.74)_32%,rgba(6,16,40,0)_64%)]"
        />
        {l.is_new && <NewTag className="absolute start-0 top-5" />}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="label-caps text-ink-2">{listingPlace(l)}</p>
          <Heading className="mt-2 font-serif text-2xl font-bold leading-tight">{listingName(l)}</Heading>
          {facts.length > 0 && <p className="mt-2 text-sm text-ink-2">{facts.join(" · ")}</p>}
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/25 pt-4">
            <p className="font-serif text-2xl font-bold">{formatPrice(l.current_price)}</p>
            <span className="flex size-11 shrink-0 items-center justify-center bg-red text-white transition-colors duration-(--dur-ui) group-hover:bg-red-dark">
              <ArrowLeftIcon className="size-5 transition-transform duration-(--dur-ui) ease-out group-hover:-translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </div>
      </ListingLink>
    </article>
  );
}
