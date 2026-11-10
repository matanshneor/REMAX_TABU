import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { LeadForm } from "@/components/lead-form";
import { Container, Fill } from "@/components/ui";
import { OFFICE } from "@/content/site";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { getAgent } from "@/lib/data";

export const metadata: Metadata = {
  title: "צור קשר",
  description: "טלפון, וואטסאפ ומייל של משה שניאור, RE/MAX טאבו נכסים, וטופס פנייה.",
  alternates: { canonical: "/contact" },
};

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-5">
      <dt className="label-caps flex items-center gap-4">
        <span className="text-ink-3" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 ps-9 text-lg text-ink-2">{children}</dd>
    </div>
  );
}

export default async function ContactPage() {
  const agent = await getAgent();
  const first = firstName(agent.full_name);
  const wa = agent.phone ? whatsappToAgent(agent.phone, undefined, first) : null;
  const link = "inline-flex min-h-11 items-center hover:text-ink underline decoration-line-strong underline-offset-8";
  return (
    <Container className="py-16 sm:py-24">
      <p className="label-caps">צור קשר</p>
      <h1 className="accent-line mt-5 font-serif text-5xl font-light leading-tight sm:text-6xl">נדבר?</h1>
      <p className="mt-6 max-w-xl text-xl text-ink-2">שאלה על נכס, תיאום סיור, או חיפוש של משהו שעוד לא באתר. {first} זמין בטלפון, בוואטסאפ ובטופס.</p>

      <div className="mt-16 grid gap-16 lg:grid-cols-2">
        <dl>
          {agent.phone && (
            <Row icon={<PhoneIcon className="size-5" />} label="טלפון">
              <a href={telHref(agent.phone)} className={link} dir="ltr">
                {agent.phone}
              </a>
            </Row>
          )}
          {wa && (
            <Row icon={<WhatsAppIcon className="size-5" />} label="וואטסאפ">
              <a href={wa} target="_blank" rel="noopener" className={link}>
                שליחת הודעה ל{first}
              </a>
            </Row>
          )}
          {agent.email && (
            <Row icon={<MailIcon className="size-5" />} label="מייל">
              <a href={`mailto:${agent.email}`} className={link} dir="ltr">
                {agent.email}
              </a>
            </Row>
          )}
          <Row icon={<MapPinIcon className="size-5" />} label="המשרד">
            {OFFICE.name}
            <br />
            <Fill text={OFFICE.address} />
          </Row>
          <Row icon={<ClockIcon className="size-5" />} label="שעות פעילות">
            <Fill text={OFFICE.hours} />
          </Row>
        </dl>
        <section aria-labelledby="form-title" className="border border-line bg-panel p-6 sm:p-10">
          <h2 id="form-title" className="font-serif text-3xl font-light">
            השאירו פרטים
          </h2>
          <p className="mb-8 mt-2 text-ink-2">{first} יחזור אליכם בהקדם.</p>
          <LeadForm agentFirstName={first} whatsappHref={wa} />
        </section>
      </div>
    </Container>
  );
}
