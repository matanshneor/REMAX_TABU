import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactCard, MobileContactBar } from "@/components/contact-card";
import { Gallery } from "@/components/gallery";
import { PageTransition } from "@/components/motion/page-transition";
import { PhotoHandoff } from "@/components/motion/photo-handoff";
import { Reveal } from "@/components/motion/reveal";
import { WhatsAppIcon } from "@/components/icons";
import { ListingCard } from "@/components/listing-card";
import { buttonClass, Container, NewTag, SectionTitle } from "@/components/ui";
import { whatsappShare } from "@/lib/contact";
import { getAgent, getListing, getListings } from "@/lib/data";
import { entryText, formatPrice, formatRooms, fullAddress, hasFloor, type Listing, listingAgent, listingDetails, listingFeatures, listingName, listingPlace, listingPreview, photoUrl, similarListings } from "@/lib/listings";

// Listing pages are built on every visit from the cached list (lib/data.ts), which the CRM's refresh
// call expires at once. A page-level copy could show a visitor (or WhatsApp's preview) the version
// from before a change, or "not on the site" for a listing added a moment ago.

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const l = await getListing(id);
  if (!l) return { title: "הנכס כבר לא באתר", robots: { index: false } };
  const { title, description, image } = listingPreview(l);
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

/** The way back to the list, over the opening photo. */
function BackLink() {
  return (
    <nav aria-label="ניווט">
      <Link href="/#listings" className="inline-flex min-h-11 items-center gap-2 text-ink transition-colors duration-(--dur-ui) hover:text-ink-2">
        <ArrowRightIcon className="size-4" aria-hidden="true" />
        לכל הנכסים
      </Link>
    </nav>
  );
}

async function ListingDetails({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const [l, all, manager] = await Promise.all([getListing(id), getListings(), getAgent()]);
  if (!l) return <NotOnSite />;
  // The contact on a listing's page is the listing's own agent.
  const agent = listingAgent(l, manager);

  const name = listingName(l);
  const details = listingDetails(l);
  const facts = keyFacts(l).map((f) => (f.label === "מ״ר" ? `${f.value} מ״ר` : f.label === "חדרים" ? `${f.value} חדרים` : f.label === "קומה" ? `קומה ${f.value}` : null)).filter(Boolean);
  const similar = similarListings(all, l);
  const location = fullAddress(l);

  return (
    <>
      {/* The opening photo is already in place when the details arrive (it came with the visitor
          from the card), so it doesn't animate; the name and price over it rise in. */}
      <Gallery id={l.id} photos={l.image_paths.map(photoUrl)} title={name} top={<BackLink />}>
        <div className="accent-line">
          {l.is_new && <NewTag className="mb-4" />}
          <h1 id="listing-title" className="rise type-display">
            {name}
          </h1>
          <p className="rise mt-3 text-lg text-ink-2" style={{ animationDelay: "60ms" }}>
            {listingPlace(l)}
          </p>
          <div className="rise mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2" style={{ animationDelay: "120ms" }}>
            <span className="type-title">{formatPrice(l.current_price)}</span>
            {facts.length > 0 && <span className="text-sm text-ink-2">{facts.join(" · ")}</span>}
          </div>
        </div>
      </Gallery>

      <Container className="pb-24 lg:pb-0">
        <div className="mt-16 grid gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
          <article aria-labelledby="listing-title">

            {l.description && (
              <Reveal as="section" className="mt-16">
                <h2 className="label-caps">על הנכס</h2>
                <p className="mt-5 max-w-prose whitespace-pre-line text-lg leading-relaxed text-ink-2">{l.description}</p>
              </Reveal>
            )}

            {details.length > 0 && (
              <Reveal as="section" className="mt-16">
                <h2 className="label-caps">פרטי הנכס</h2>
                <dl className="mt-5 grid gap-x-12 sm:grid-cols-2">
                  {details.map((d) => (
                    <div key={d.label} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
                      <dt className="text-ink-3">{d.label}</dt>
                      <dd className="text-end text-ink">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}

            <Reveal as="section" className="mt-16">
              <h2 className="label-caps">כתובת</h2>
              <p className="mt-5 flex items-center gap-3 text-lg text-ink-2">
                <MapPinIcon className="size-5 shrink-0 text-ink-3" aria-hidden="true" />
                {location || "ירושלים"}
              </p>
              <a href={whatsappShare(l)} target="_blank" rel="noopener" className={buttonClass("outline", "mt-12")}>
                <WhatsAppIcon className="size-5" />
                שתפו את הנכס
              </a>
            </Reveal>
          </article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <ContactCard agent={agent} listing={l} />
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="similar-title" className="mt-32">
            <Reveal>
              <SectionTitle id="similar-title" title="נכסים דומים" />
            </Reveal>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s, i) => (
                <Reveal as="li" key={s.id} index={i}>
                  <ListingCard listing={s} />
                </Reveal>
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
      <h1 className="accent-line type-title">הנכס הזה כבר לא באתר</h1>
      <p className="mt-4 max-w-md text-lg text-ink-2">ייתכן שהוא נמכר או ירד מהשוק. אפשר לראות את הנכסים שמוצעים עכשיו.</p>
      <Link href="/#listings" className={buttonClass("red", "mt-10")}>
        לכל הנכסים
      </Link>
    </Container>
  );
}

/** While the details are on their way: the same top of the page, with the pressed photo in its slot. */
function DetailsFallback() {
  return (
    <div aria-busy="true" aria-label="טוען את הנכס">
      <PhotoHandoff />
    </div>
  );
}

export default function ListingPage(props: PageProps<"/properties/[id]">) {
  return (
    <PageTransition>
      <Suspense fallback={<DetailsFallback />}>
        <ListingDetails params={props.params} />
      </Suspense>
    </PageTransition>
  );
}
