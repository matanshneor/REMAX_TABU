import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingsFallback, ListingsSection } from "@/components/listings-section";
import { type NovaSlide, NovaHero } from "@/components/nova-hero";
import { Container, SectionTitle } from "@/components/ui";
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
  return <NovaHero slides={slides} />;
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Hero />
      <section id="listings" aria-labelledby="listings-title" className="scroll-mt-20 pt-24 sm:pt-32">
        <Container>
          <div className="mb-10">
            <SectionTitle id="listings-title" label="למכירה עכשיו" title="הנכסים" />
          </div>
          <Suspense fallback={<ListingsFallback />}>
            <ListingsSection searchParams={searchParams} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
