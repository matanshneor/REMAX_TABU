import { ArrowDownIcon } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { getListings } from "@/lib/data";
import { formatPrice, formatRooms, listingFeatures, listingName, listingPlace, photoUrl } from "@/lib/listings";
import { ListingsFallback, ListingsSection } from "./listings-section";
import { HeaderMode } from "./motion/header-mode";
import { PageTransition } from "./motion/page-transition";
import { HERO_FRAME, type NovaSlide, NovaHero } from "./nova-hero";
import { buttonClass, Container } from "./ui";

/**
 * The opening. The home page opens with the office itself: the RE/MAX balloon photo, the office's
 * name and its line (the owner's choice, 11.11.2026). An old link from the CRM ("/p/<listing>")
 * still opens with the listing it names; if that one has left the site, the visitor gets the
 * office opening.
 */
async function Hero({ first }: { first?: Promise<string | undefined> }) {
  const [listings, wantedId] = await Promise.all([getListings(), first]);
  const l = wantedId ? listings.find((x) => x.id === wantedId) : undefined;
  if (!l) return <OfficeHero />;
  const slide: NovaSlide = {
    id: l.id,
    image: l.image_paths[0] ? photoUrl(l.image_paths[0]) : null,
    name: listingName(l),
    place: listingPlace(l),
    price: formatPrice(l.current_price),
    facts: [
      l.rooms != null ? `${formatRooms(l.rooms)} חדרים` : "",
      l.size_sqm != null ? `${formatRooms(l.size_sqm)} מ״ר` : "",
      ...listingFeatures(l).slice(0, 2),
    ].filter(Boolean),
    blurb: (l.description ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
    isNew: l.is_new,
  };
  return <NovaHero slide={slide} />;
}

/** The office's own opening: the balloon photo, the name, the line, and the way down to the listings. */
function OfficeHero() {
  return (
    <section aria-labelledby="hero-title" className={`${HERO_FRAME} bg-night`}>
      <HeaderMode />
      {/* A wide screen shows the whole photo. A phone shows its left part at three quarters of the
          screen's height, which is where the whole balloon fits; the text sits under it. */}
      <div aria-hidden="true" className="drift absolute inset-x-0 top-0 h-[72svh] md:inset-0 md:h-auto">
        <Image src="/home-hero.jpg" alt="" fill preload sizes="(min-width: 768px) 100vw, 110svh" className="object-cover object-[14%_center] md:object-center" />
      </div>
      {/* Shade: dark behind the header and on the text side; on a phone the photo fades into the page under the balloon. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(10,26,58,0.8)_0%,rgba(10,26,58,0)_24%),linear-gradient(to_left,rgba(10,26,58,0.92)_0%,rgba(10,26,58,0.66)_34%,rgba(10,26,58,0)_62%)] max-md:bg-[linear-gradient(to_bottom,rgba(10,26,58,0.75)_0%,rgba(10,26,58,0)_14%),linear-gradient(to_top,rgb(10,26,58)_0%,rgb(10,26,58)_29%,rgba(10,26,58,0.7)_37%,rgba(10,26,58,0)_52%)]"
      />
      <div className="relative z-[4] mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-10 pt-26 sm:px-8 sm:pb-16 sm:pt-34 md:justify-center md:pb-0 md:pt-20">
        <div className="max-w-2xl">
          <h1 id="hero-title" className="rise font-serif text-[clamp(2.75rem,1.4rem+6.2vw,6rem)] font-bold leading-[0.98] tracking-tight" style={{ animationDelay: "60ms" }}>
            רימקס
            <br />
            טאבו נכסים
          </h1>
          {/* The office's line, on the brand's red. */}
          <p className="rise mt-6 inline-block bg-red px-4 py-2 font-serif text-[clamp(1.25rem,1rem+1.2vw,2rem)] font-medium leading-tight text-white sm:px-5 sm:py-2.5" style={{ animationDelay: "140ms" }}>
            עם הצלחה לא מתווכחים
          </p>
          <div className="rise mt-8 sm:mt-10" style={{ animationDelay: "220ms" }}>
            <a href="#listings" className={buttonClass("outline", "gap-3 border-white/70 bg-night/30 px-7 backdrop-blur-sm")}>
              לכל הנכסים
              <ArrowDownIcon className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The opening's place, held while the listing for this visit is chosen. */
function HeroFallback() {
  return (
    <div aria-hidden="true" className={`${HERO_FRAME} bg-gradient-to-b from-panel to-night`}>
      <HeaderMode />
    </div>
  );
}

/**
 * The home page: the opening listing, then the search and the list. Used by "/" and by
 * "/p/<listing id>" (the address the CRM sends: the same page, opening with that listing).
 */
export function HomeContent({
  searchParams,
  first,
  base,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  first?: Promise<string | undefined>;
  /** The address searches stay on (this page's own address); "/" when not given. */
  base?: Promise<string>;
}) {
  return (
    <PageTransition>
      <Suspense fallback={<HeroFallback />}>
        <Hero first={first} />
      </Suspense>
      <section id="listings" aria-labelledby="listings-title" className="scroll-mt-20 pt-16 sm:pt-24">
        <Container>
          <h2 id="listings-title" className="sr-only">
            הנכסים
          </h2>
          <Suspense fallback={<ListingsFallback />}>
            <ListingsSection searchParams={searchParams} base={base} />
          </Suspense>
        </Container>
      </section>
    </PageTransition>
  );
}
