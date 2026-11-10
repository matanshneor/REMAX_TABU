import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { ListingsFallback, ListingsSection } from "@/components/listings-section";
import { PhotoPlaceholder } from "@/components/listing-photo";
import { buttonClass, Container, SectionTitle } from "@/components/ui";
import { getListings } from "@/lib/data";
import { photoUrl } from "@/lib/listings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** The opening photo: the newest listing that has photos. */
async function Hero() {
  const listings = await getListings();
  const cover = listings.find((l) => l.image_paths.length > 0);
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[calc(100svh-4rem)] items-end overflow-hidden sm:min-h-[calc(100svh-5rem)]">
      {cover ? (
        <Image src={photoUrl(cover.image_paths[0])} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      ) : (
        <div className="-z-20">
          <PhotoPlaceholder label="" />
        </div>
      )}
      {/* Dark layer so the title reads on any photo. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/60 to-night/25" />
      <Container className="pb-16 pt-32 sm:pb-24">
        <p className="label-caps text-ink-2">RE/MAX טאבו נכסים · ירושלים</p>
        <h1 id="hero-title" className="mt-5 max-w-3xl font-serif text-5xl font-light leading-[1.1] sm:text-7xl">
          בתים יוצאי דופן, מבפנים החוצה
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-2">בתים, קוטג׳ים ודירות גן למכירה, עם ליווי אישי של משה שניאור מהסיור הראשון ועד החתימה.</p>
        <a href="#listings" className={buttonClass("red", "mt-10 min-h-14 px-8 text-base")}>
          לגלות את הנכסים
        </a>
      </Container>
    </section>
  );
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
