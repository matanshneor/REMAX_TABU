import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingsFallback, ListingsSection } from "@/components/listings-section";
import { HeaderMode } from "@/components/motion/header-mode";
import { PageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { type NovaSlide, NovaHero } from "@/components/nova-hero";
import { buttonClass, Container, SectionTitle } from "@/components/ui";
import { getListings } from "@/lib/data";
import { formatPrice, formatRooms, listingFeatures, listingName, listingPlace, photoUrl } from "@/lib/listings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** The opening slider: every listing, newest first (those with photos lead). */
async function Hero() {
  const listings = await getListings();
  const ordered = [...listings.filter((l) => l.image_paths.length), ...listings.filter((l) => !l.image_paths.length)];
  const slides: NovaSlide[] = ordered.map((l) => ({
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
  }));
  return slides.length ? <NovaHero slides={slides} /> : <EmptyHero />;
}

/** No listings on the site right now: the same opening, without a photo, pointing to Moshe. */
function EmptyHero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-16 flex min-h-[70svh] items-end overflow-hidden bg-gradient-to-b from-panel to-night sm:-mt-20">
      <HeaderMode />
      <Container className="pb-16 pt-34">
        <p className="label-caps text-ink-2">RE/MAX טאבו נכסים · ירושלים</p>
        <h1 id="hero-title" className="accent-line type-display mt-5 max-w-3xl">
          בתים יוצאי דופן, מבפנים החוצה
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-2">נכסים חדשים עולים לאתר בקרוב. בינתיים אפשר לספר למשה מה אתם מחפשים, והוא יחזור אליכם.</p>
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
      <Hero />
      <section id="listings" aria-labelledby="listings-title" className="scroll-mt-20 pt-24 sm:pt-32">
        <Container>
          <Reveal className="mb-10">
            <SectionTitle id="listings-title" label="למכירה עכשיו" title="הנכסים" />
          </Reveal>
          <Suspense fallback={<ListingsFallback />}>
            <ListingsSection searchParams={searchParams} />
          </Suspense>
        </Container>
      </section>
    </PageTransition>
  );
}
