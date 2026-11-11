import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { buttonClass, Container, Fill } from "@/components/ui";
import { ABOUT, OFFICE } from "@/content/site";
import { firstName } from "@/lib/contact";
import { getAgent, getListings } from "@/lib/data";
import { agentPhotoUrl } from "@/lib/listings";

export const metadata: Metadata = {
  title: " משה שניאור",
  description: "משה שניאור, זכיין RE/MAX טאבו נכסים: ליווי אישי במכירה ובקנייה של בתים בירושלים.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [agent, listings] = await Promise.all([getAgent(), getListings()]);
  const photo = agentPhotoUrl(agent);
  const areas = [...new Set([...ABOUT.areas, ...listings.map((l) => l.neighborhood).filter((x): x is string => !!x)])];
  const first = firstName(agent.full_name);

  return (
    <PageTransition>
    <Container className="py-16 sm:py-24">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        {photo && (
          <div className="relative aspect-[4/5] overflow-hidden border border-line bg-gradient-to-b from-panel to-night">
            <Image src={photo} alt={agent.full_name} fill loading="eager" sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover object-top" />
          </div>
        )}
        <div>
          <p className="label-caps">זכיין {OFFICE.name}</p>
          <h1 className="accent-line type-display mt-5">{ABOUT.title}</h1>
          <p className="mt-8 text-xl leading-relaxed text-ink-2">{ABOUT.lead}</p>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-2">
            {ABOUT.paragraphs.map((p, i) => (
              <p key={i}>
                <Fill text={p} />
              </p>
            ))}
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-8 sm:max-w-md">
            {ABOUT.facts.map((f, i) => (
              <Reveal key={f.label} index={i} className="accent-line flex flex-col-reverse">
                <dt className="label-caps mt-2">{f.label}</dt>
                <dd className="type-subtitle">
                  <Fill text={f.value} className="text-base" />
                </dd>
              </Reveal>
            ))}
          </dl>

          <Reveal as="section" className="mt-14">
            <h2 className="label-caps">{ABOUT.areasTitle}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {areas.map((a) => (
                <li key={a} className="border border-line-strong px-4 py-2 text-ink-2">
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* The page's own next step; WhatsApp and the phone are right below, in the footer. */}
          <Reveal className="mt-14">
            <Link href="/#listings" className={buttonClass("red")}>
              לנכסים של {first}
            </Link>
          </Reveal>
        </div>
      </div>
    </Container>
    </PageTransition>
  );
}
