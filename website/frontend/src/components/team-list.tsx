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
      <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
        {team.map((a, i) => (
          <Reveal key={`${a.full_name}:${a.phone ?? i}`} as="li" index={i % 4}>
            <TeamMember agent={a} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/** The cut-out fades into the page at the bottom and the sides, so no straight edge shows. */
export const PORTRAIT_FADE = {
  maskImage: "linear-gradient(to bottom, #000 72%, transparent 100%), linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
  maskComposite: "intersect",
  WebkitMaskImage: "linear-gradient(to bottom, #000 72%, transparent 100%), linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
  WebkitMaskComposite: "source-in",
} as const;

function TeamMember({ agent }: { agent: Agent }) {
  const photo = agentPhotoUrl(agent);
  return (
    <article className="flex flex-col items-center text-center">
      <div className="relative size-28 sm:size-36" style={PORTRAIT_FADE}>
        {photo && <Image src={photo} alt="" fill sizes="144px" className="object-contain object-bottom" />}
      </div>
      <h3 className="mt-3 font-serif text-lg">{agent.full_name}</h3>
    </article>
  );
}
