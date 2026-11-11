import { ArrowLeftIcon, MapPinIcon } from "lucide-react";
import Image from "next/image";
import { PhotoPlaceholder } from "./listing-photo";
import { HeaderMode } from "./motion/header-mode";
import { ListingLink } from "./motion/listing-link";
import { cn, NewTag, PRESS } from "./ui";

/** The listing the opening shows (prepared on the server). */
export type NovaSlide = {
  id: string;
  image: string | null; // /media/... or null for the branded stand-in
  name: string; // "בית פרטי ברחוב תגר 15"
  place: string; // "פסגת זאב מזרח, ירושלים"
  price: string; // "6,490,000 ₪"
  facts: string[]; // ["7 חדרים", "250 מ״ר", "ממ״ד"]
  blurb: string; // the start of the description
  isNew: boolean;
};

/** The frame of the opening: full screen, under the header (which stays clear until the page scrolls). */
export const HERO_FRAME = "relative isolate -mt-16 flex min-h-svh overflow-hidden sm:-mt-20";

/**
 * The opening of the home page: one listing, its photo filling the screen with nothing on top of
 * it but its own details. There is nothing to flip through here (the owner's choice): every visit
 * shows a different listing, and the full list is right below.
 */
export function NovaHero({ slide: s }: { slide: NovaSlide }) {
  return (
    <section aria-labelledby="hero-title" className={HERO_FRAME}>
      <HeaderMode />

      {/* The photo, drifting slowly. */}
      <div aria-hidden="true" className="drift absolute inset-0">
        {s.image ? <Image src={s.image} alt="" fill preload sizes="100vw" className="object-cover" /> : <PhotoPlaceholder label="" />}
      </div>

      {/* Shade: dark behind the header, on the text side and at the bottom, so everything reads on any photo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_26%),linear-gradient(to_left,rgba(10,26,58,0.92)_0%,rgba(10,26,58,0.6)_38%,rgba(10,26,58,0.1)_70%),linear-gradient(to_top,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_45%)] max-md:bg-[linear-gradient(to_bottom,rgba(10,26,58,0.85)_0%,rgba(10,26,58,0)_22%),linear-gradient(to_top,rgba(10,26,58,0.95)_0%,rgba(10,26,58,0.7)_45%,rgba(10,26,58,0.2)_100%)]"
      />

      <div className="relative z-[4] mx-auto flex w-full max-w-7xl flex-col justify-between gap-10 px-4 pb-12 pt-26 sm:px-8 sm:pb-16 sm:pt-34">
        {/* Top: the site's own line */}
        <h1 id="hero-title" className="label-caps text-ink-2">
          RE/MAX טאבו נכסים · ירושלים
        </h1>

        <div className="max-w-xl">
          <p className="rise label-caps flex items-center gap-2 text-ink-2" style={{ animationDelay: "40ms" }}>
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            {s.place}
            {s.isNew && <NewTag className="ms-2" />}
          </p>
          <h2 className="rise accent-line type-display mt-5" style={{ animationDelay: "100ms" }}>
            {s.name}
          </h2>
          {s.blurb && (
            <p className="rise mt-5 line-clamp-3 max-w-lg leading-relaxed text-ink-2 max-sm:hidden" style={{ animationDelay: "160ms" }}>
              {s.blurb}
            </p>
          )}
          <div className="rise mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2" style={{ animationDelay: "220ms" }}>
            <span className="type-title">{s.price}</span>
            {s.facts.length > 0 && <span className="text-sm text-ink-2">{s.facts.join(" · ")}</span>}
          </div>
          <div className="rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ animationDelay: "280ms" }}>
            {/* Hands the photo on show over to the listing's page. */}
            <ListingLink id={s.id} photoScope="section" className="group/cta inline-flex min-h-12 items-center gap-4">
              <span className={cn("inline-flex size-12 items-center justify-center bg-red text-white group-hover/cta:bg-red-dark group-active/cta:scale-[0.97]", PRESS)}>
                <ArrowLeftIcon className="size-5 transition-transform duration-(--dur-ui) ease-out group-hover/cta:-translate-x-1" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium tracking-[0.2em]">לפרטי הנכס</span>
            </ListingLink>
            <a
              href="#listings"
              className="inline-flex min-h-11 items-center text-sm text-ink-2 underline decoration-line-strong underline-offset-8 transition-colors duration-(--dur-ui) hover:text-ink"
            >
              לכל הנכסים
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
