import Image from "next/image";
import { type Agent, agentPhotoUrl } from "@/lib/listings";
import { Reveal } from "./motion/reveal";

/**
 * The office team on "המשרד שלנו": a photo and a name for each agent, nothing else (the owner's
 * choice, 11.11.2026). An agent's contact details appear on the pages of their own listings.
 */
export function TeamList({ team }: { team: Agent[] }) {
  return (
    <section aria-labelledby="team-title" className="mt-16 border-t border-line pt-12 sm:mt-20 sm:pt-16">
      <h2 id="team-title" className="accent-line type-headline">
        הסוכנים שלנו
      </h2>
      <ul className="mt-12 grid gap-x-8 gap-y-12 grid-cols-2 lg:grid-cols-4">
        {team.map((a, i) => (
          <Reveal key={`${a.full_name}:${a.phone ?? i}`} as="li" index={i % 4}>
            <TeamMember agent={a} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function TeamMember({ agent }: { agent: Agent }) {
  const photo = agentPhotoUrl(agent);
  return (
    <article>
      <div className="relative aspect-[4/5] overflow-hidden">
        {photo && <Image src={photo} alt="" fill sizes="(min-width: 1024px) 290px, 50vw" className="object-cover object-top" />}
      </div>
      <h3 className="type-subtitle mt-5">{agent.full_name}</h3>
    </article>
  );
}
