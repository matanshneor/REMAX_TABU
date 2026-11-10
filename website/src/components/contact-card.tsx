import { PhoneIcon } from "lucide-react";
import Image from "next/image";
import { OFFICE } from "@/content/site";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { type Agent, agentPhotoUrl, type Listing } from "@/lib/listings";
import { WhatsAppIcon } from "./icons";
import { LeadForm } from "./lead-form";
import { buttonClass } from "./ui";

/** The agent's card on a listing: photo, name, phone, WhatsApp / call buttons and the form. */
export function ContactCard({ agent, listing, title = "לתיאום סיור" }: { agent: Agent; listing?: Listing; title?: string }) {
  const photo = agentPhotoUrl(agent);
  const first = firstName(agent.full_name);
  const wa = agent.phone ? whatsappToAgent(agent.phone, listing, first) : null;
  return (
    <section aria-labelledby="contact-card-title" className="border border-line bg-panel p-6 sm:p-8">
      <h2 id="contact-card-title" className="label-caps">
        {title}
      </h2>
      <div className="mt-6 flex items-center gap-5">
        {photo && (
          <div className="relative size-24 shrink-0 overflow-hidden bg-night">
            <Image src={photo} alt={agent.full_name} fill sizes="96px" className="object-cover object-top" />
          </div>
        )}
        <div>
          <p className="font-serif text-2xl font-light">{agent.full_name}</p>
          <p className="mt-0.5 text-sm text-ink-3">זכיין {OFFICE.name}</p>
          {agent.phone && (
            <a href={telHref(agent.phone)} className="mt-1 inline-flex min-h-11 items-center text-ink-2 hover:text-ink" dir="ltr">
              {agent.phone}
            </a>
          )}
        </div>
      </div>
      {agent.phone && (
        <div className="mt-6 grid gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className={buttonClass("red")}>
              <WhatsAppIcon className="size-5" />
              וואטסאפ ל{first}
            </a>
          )}
          <a href={telHref(agent.phone)} className={buttonClass("outline")}>
            <PhoneIcon className="size-5" aria-hidden="true" />
            חיוג
          </a>
        </div>
      )}
      <div className="mt-8 border-t border-line pt-8">
        <p className="mb-5 text-ink-2">או השאירו פרטים, ו{first} יחזור אליכם:</p>
        <LeadForm propertyId={listing?.id} whatsappHref={wa} agentFirstName={first} />
      </div>
    </section>
  );
}

/** Phones: WhatsApp and call, always at the bottom of a listing page. */
export function MobileContactBar({ agent, listing }: { agent: Agent; listing: Listing }) {
  if (!agent.phone) return null;
  const wa = whatsappToAgent(agent.phone, listing, firstName(agent.full_name));
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-night pb-[env(safe-area-inset-bottom)] lg:hidden">
      <a href={wa} target="_blank" rel="noopener" className={buttonClass("red", "min-h-14")}>
        <WhatsAppIcon className="size-5" />
        וואטסאפ
      </a>
      <a href={telHref(agent.phone)} className={buttonClass("panel", "min-h-14")}>
        <PhoneIcon className="size-5" aria-hidden="true" />
        חיוג
      </a>
    </div>
  );
}
