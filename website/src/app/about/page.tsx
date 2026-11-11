import type { Metadata } from "next";
import Image from "next/image";
import { PageTransition } from "@/components/motion/page-transition";
import { PORTRAIT_FADE, TeamList } from "@/components/team-list";
import { Container, Fill } from "@/components/ui";
import { ABOUT, OFFICE, OFFICE_ABOUT } from "@/content/site";
import { getAgent, getTeam } from "@/lib/data";
import { agentPhotoUrl } from "@/lib/listings";

export const metadata: Metadata = {
  title: "המשרד שלנו",
  description: "RE/MAX טאבו נכסים בירושלים: משה שניאור, זכיין המשרד, וצוות הסוכנים שמלווה אתכם במכירה ובקנייה.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [agent, team] = await Promise.all([getAgent(), getTeam()]);
  // The manager has the top of the page; the list below is the rest of the team.
  const others = team.filter((a) => !a.is_manager);
  const photo = agentPhotoUrl(agent);

  return (
    <PageTransition>
    <Container className="py-16 sm:py-24">
      {/* The office in its own words, then the manager, then the team. */}
      <header className="max-w-3xl">
        <p className="label-caps">{OFFICE.name} · ירושלים</p>
        <h1 className="accent-line type-display mt-5">{OFFICE_ABOUT.title}</h1>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-2">
          {OFFICE_ABOUT.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </header>
      {/* The manager: one compact block, since the whole team follows. */}
      <section aria-labelledby="manager-title" className="mt-16 flex flex-col gap-8 border-t border-line pt-12 sm:mt-20 sm:flex-row sm:items-start sm:gap-10 sm:pt-16">
        {photo && (
          <div className="relative size-36 shrink-0 sm:size-44" style={PORTRAIT_FADE}>
            <Image src={photo} alt={agent.full_name} fill sizes="176px" className="object-contain object-bottom" />
          </div>
        )}
        <div className="max-w-2xl">
          <p className="label-caps">זכיין {OFFICE.name}</p>
          <h2 id="manager-title" className="accent-line type-headline mt-4">{ABOUT.title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{ABOUT.lead}</p>
          {ABOUT.paragraphs.map((p, i) => (
            <p key={i} className="mt-4 leading-relaxed text-ink-2">
              <Fill text={p} />
            </p>
          ))}
          <p className="mt-5 text-ink-3">
            {ABOUT.facts.map((f) => (
              <span key={f.label}>
                {f.label} <Fill text={f.value} className="text-base" />
              </span>
            ))}
          </p>
        </div>
      </section>
      {others.length > 0 && <TeamList team={others} />}
    </Container>
    </PageTransition>
  );
}
