import { ArrowRightIcon, CheckIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactCard, MobileContactBar } from "@/components/contact-card";
import { Gallery } from "@/components/gallery";
import { WhatsAppIcon } from "@/components/icons";
import { ListingCard } from "@/components/listing-card";
import { buttonClass, Container, NewTag, SectionTitle } from "@/components/ui";
import { whatsappShare } from "@/lib/contact";
import { getAgent, getListing, getListings } from "@/lib/data";
import { entryText, formatPrice, formatRooms, fullAddress, hasFloor, type Listing, listingFeatures, listingName, listingPlace, photoUrl, similarListings } from "@/lib/listings";

// Listing pages are built on every visit from the cached list (lib/data.ts), which the CRM's refresh
// call expires at once. A page-level copy could show a visitor (or WhatsApp's preview) the version
// from before a change, or "not on the site" for a listing added a moment ago.

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const l = await getListing(id);
  if (!l) return { title: "הנכס כבר לא באתר", robots: { index: false } };
  const title = `${listingName(l)}, ${listingPlace(l)} · ${formatPrice(l.current_price)}`;
  const facts = [l.rooms != null && `${formatRooms(l.rooms)} חדרים`, l.size_sqm != null && `${formatRooms(l.size_sqm)} מ״ר`, ...listingFeatures(l).slice(0, 3)]
    .filter(Boolean)
    .join(" · ");
  const description = [facts, l.description?.replace(/\s+/g, " ").slice(0, 160)].filter(Boolean).join(". ");
  // WhatsApp and Facebook previews: the first photo through the image optimizer, kept near 200KB
  // (WhatsApp skips preview images much over 300KB).
  const image = l.image_paths[0]
    ? { url: `/_next/image?url=${encodeURIComponent(photoUrl(l.image_paths[0]))}&w=828&q=75`, width: 828, alt: title }
    : { url: "/og-default.png", width: 1200, height: 630, alt: "RE/MAX טאבו נכסים" };
  return {
    title,
    description,
    alternates: { canonical: `/properties/${l.id}` },
    openGraph: { type: "website", title, description, url: `/properties/${l.id}`, images: [image] },
  };
}

/** The four key figures: rooms, size, floor (where it applies) and entry; the type fills a gap. */
function keyFacts(l: Listing): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (l.rooms != null) facts.push({ label: "חדרים", value: formatRooms(l.rooms) });
  if (l.size_sqm != null) facts.push({ label: "מ״ר", value: formatRooms(l.size_sqm) });
  if (hasFloor(l))
    facts.push({ label: "קומה", value: l.floor === 0 ? "קרקע" : l.total_floors ? `${l.floor} מתוך ${l.total_floors}` : String(l.floor) });
  const entry = entryText(l);
  if (entry) facts.push({ label: "כניסה", value: entry });
  if (facts.length < 4 && l.property_type) facts.push({ label: "סוג נכס", value: l.property_type });
  if (facts.length < 4 && l.parking_spots > 0) facts.push({ label: "חניות", value: String(l.parking_spots) });
  return facts.slice(0, 4);
}

async function ListingDetails({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const [l, all, agent] = await Promise.all([getListing(id), getListings(), getAgent()]);
  if (!l) return <NotOnSite />;

  const name = listingName(l);
  const features = listingFeatures(l);
  const facts = keyFacts(l);
  const similar = similarListings(all, l);
  const location = fullAddress(l);

  return (
    <>
      <Container className="pb-24 lg:pb-0">
        <nav aria-label="ניווט" className="py-6">
          <Link href="/#listings" className="inline-flex min-h-11 items-center gap-2 text-ink-2 hover:text-ink">
            <ArrowRightIcon className="size-4" aria-hidden="true" />
            לכל הנכסים
          </Link>
        </nav>

        <Gallery photos={l.image_paths.map(photoUrl)} title={name} />

        <div className="mt-12 grid gap-16 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_400px]">
          <article aria-labelledby="listing-title">
            <header className="accent-line">
              {l.is_new && <NewTag className="mb-4" />}
              <h1 id="listing-title" className="font-serif text-4xl font-light leading-tight sm:text-5xl">
                {name}
              </h1>
              <p className="mt-3 text-lg text-ink-3">{listingPlace(l)}</p>
              <p className="mt-8 font-serif text-4xl font-light sm:text-5xl">{formatPrice(l.current_price)}</p>
            </header>

            {facts.length > 0 && (
              <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.label} className="accent-line flex flex-col-reverse">
                    <dt className="label-caps mt-2">{f.label}</dt>
                    <dd className="font-serif text-3xl font-light">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {l.description && (
              <section aria-labelledby="about-title" className="mt-16">
                <h2 id="about-title" className="label-caps">
                  על הנכס
                </h2>
                <p className="mt-5 max-w-prose whitespace-pre-line text-lg leading-relaxed text-ink-2">{l.description}</p>
              </section>
            )}

            {features.length > 0 && (
              <section aria-labelledby="features-title" className="mt-16">
                <h2 id="features-title" className="label-caps">
                  מאפיינים
                </h2>
                <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                  {features.map((x) => (
                    <li key={x} className="flex items-center gap-3 border-b border-line pb-4 text-ink-2">
                      <CheckIcon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                      {x}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="location-title" className="mt-16">
              <h2 id="location-title" className="label-caps">
                כתובת
              </h2>
              <p className="mt-5 flex items-center gap-3 text-lg text-ink-2">
                <MapPinIcon className="size-5 shrink-0 text-ink-3" aria-hidden="true" />
                {location || "ירושלים"}
              </p>
            </section>

            <a href={whatsappShare(l)} target="_blank" rel="noopener" className={buttonClass("outline", "mt-12")}>
              <WhatsAppIcon className="size-5" />
              שיתוף הנכס בוואטסאפ
            </a>
          </article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <ContactCard agent={agent} listing={l} />
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="similar-title" className="mt-32">
            <SectionTitle id="similar-title" label="עוד מהנכסים של משה" title="נכסים דומים" />
            <ul className="mt-10 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <li key={s.id}>
                  <ListingCard listing={s} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
      <MobileContactBar agent={agent} listing={l} />
    </>
  );
}

function NotOnSite() {
  return (
    <Container className="py-32">
      <h1 className="accent-line font-serif text-4xl font-light">הנכס הזה כבר לא באתר</h1>
      <p className="mt-4 max-w-md text-lg text-ink-2">ייתכן שהוא נמכר או ירד מהשוק. אפשר לראות את הנכסים שמוצעים עכשיו.</p>
      <Link href="/#listings" className={buttonClass("red", "mt-10")}>
        לכל הנכסים
      </Link>
    </Container>
  );
}

function DetailsFallback() {
  return (
    <Container aria-busy="true" aria-label="טוען את הנכס">
      <div className="h-17" />
      <div className="aspect-[4/5] animate-pulse bg-panel lg:aspect-auto lg:h-[min(72vh,640px)]" />
      <div className="mt-16 h-12 w-1/2 animate-pulse bg-panel" />
    </Container>
  );
}

export default function ListingPage(props: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<DetailsFallback />}>
      <ListingDetails params={props.params} />
    </Suspense>
  );
}
