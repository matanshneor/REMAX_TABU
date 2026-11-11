import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingsFallback, ListingsSection } from "@/components/listings-section";
import { HeaderMode } from "@/components/motion/header-mode";
import { PageTransition } from "@/components/motion/page-transition";
import { HERO_FRAME, type NovaSlide, NovaHero } from "@/components/nova-hero";
import { buttonClass, Container } from "@/components/ui";
import { getListings } from "@/lib/data";
import { formatPrice, formatRooms, listingFeatures, listingName, listingPlace, photoUrl } from "@/lib/listings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Any one of them. Called once per visit, on the server, after connection(). */
const anyOf = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** The opening: one listing, a different one on every visit (those with photos, when there are any). */
async function Hero() {
  const listings = await getListings();
  if (!listings.length) return <EmptyHero />;
  const withPhotos = listings.filter((l) => l.image_paths.length);
  const pool = withPhotos.length ? withPhotos : listings;
  await connection(); // chosen per visit, not once for everyone
  const l = anyOf(pool);
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

/** The opening's place, held while the listing for this visit is chosen. */
function HeroFallback() {
  return (
    <div aria-hidden="true" className={`${HERO_FRAME} bg-gradient-to-b from-panel to-night`}>
      <HeaderMode />
    </div>
  );
}

/** No listings on the site right now: the same opening, without a photo, pointing to Moshe. */
function EmptyHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-16 flex min-h-[70svh] items-end overflow-hidden bg-gradient-to-b from-panel to-night sm:-mt-20">
      <HeaderMode />
      <Container className="pb-16 pt-34">
        <p className="label-caps text-ink-2">RE/MAX טאבו נכסים · ירושלים</p>
        <h1 id="hero-title" className="accent-line type-display mt-5 max-w-3xl">
          נכסים חדשים עולים לאתר בקרוב
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-2">בינתיים אפשר לספר למשה מה אתם מחפשים, והוא יחזור אליכם.</p>
        <Link href="/contact" className={buttonClass("red", "mt-10")}>
          לספר למשה מה מחפשים
        </Link>
      </Container>
    </section>
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <PageTransition>
      <Suspense fallback={<HeroFallback />}>
        <Hero />
      </Suspense>
      <section id="listings" aria-labelledby="listings-title" className="scroll-mt-20 pt-16 sm:pt-24">
        <Container>
          <h2 id="listings-title" className="sr-only">
            הנכסים
          </h2>
          <Suspense fallback={<ListingsFallback />}>
            <ListingsSection searchParams={searchParams} />
          </Suspense>
        </Container>
      </section>
    </PageTransition>
  );
}
