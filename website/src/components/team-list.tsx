import { MailIcon, PhoneIcon } from "lucide-react";
import Image from "next/image";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { type Agent, agentPhotoUrl } from "@/lib/listings";
import { WhatsAppIcon } from "./icons";
import { Reveal } from "./motion/reveal";
import { buttonClass } from "./ui";

/**
 * The office team on "המשרד שלנו": each agent's photo, name, title, license, a few words (when
 * written in the CRM) and how to reach them. An agent without an email simply has none shown.
 */
export function TeamList({ team }: { team: Agent[] }) {
  return (
    <section aria-labelledby="team-title" className="mt-16 border-t border-line pt-12 sm:mt-20 sm:pt-16">
      <h2 id="team-title" className="accent-line type-headline">
        הסוכנים שלנו
      </h2>
      <ul className="mt-12 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((a, i) => (
          <Reveal key={`${a.full_name}:${a.phone ?? i}`} as="li" index={i % 3}>
            <TeamMember agent={a} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

function TeamMember({ agent }: { agent: Agent }) {
  const photo = agentPhotoUrl(agent);
  const first = firstName(agent.full_name);
  return (
    <article className="flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden border border-line bg-gradient-to-b from-panel to-night">
        {photo && <Image src={photo} alt={agent.full_name} fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw" className="object-cover object-top" />}
      </div>
      <h3 className="type-subtitle mt-6">{agent.full_name}</h3>
      <p className="mt-1 text-ink-3">{[agent.title, agent.license ? `רישיון תיווך ${agent.license}` : null].filter(Boolean).join(" · ")}</p>
      {agent.bio && <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-2">{agent.bio}</p>}
      <div className="mt-auto pt-5">
        {agent.phone && (
          <a href={telHref(agent.phone)} className="flex min-h-11 items-center gap-2 text-ink-2 transition-colors duration-(--dur-ui) hover:text-ink">
            <PhoneIcon className="size-4 shrink-0" aria-hidden="true" />
            <span dir="ltr">{agent.phone}</span>
          </a>
        )}
        {agent.email && (
          <a href={`mailto:${agent.email}`} className="flex min-h-11 items-center gap-2 break-all text-ink-2 transition-colors duration-(--dur-ui) hover:text-ink">
            <MailIcon className="size-4 shrink-0" aria-hidden="true" />
            <span dir="ltr">{agent.email}</span>
          </a>
        )}
        {agent.phone && (
          <a href={whatsappToAgent(agent.phone, undefined, first)} target="_blank" rel="noopener" className={buttonClass("outline", "mt-3 w-full")}>
            <WhatsAppIcon className="size-5" />
            וואטסאפ ל{first}
          </a>
        )}
      </div>
    </article>
  );
}
