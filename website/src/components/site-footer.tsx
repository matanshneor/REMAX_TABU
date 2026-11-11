import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { LICENSE, OFFICE } from "@/content/site";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { getAgent } from "@/lib/data";
import { WhatsAppIcon } from "./icons";
import { NAV } from "./site-header";
import { Reveal } from "./motion/reveal";
import { buttonClass, Container, Logo } from "./ui";

/**
 * Every page ends here: first the two quickest ways to reach the agent, then the quiet details.
 */
export async function SiteFooter() {
  const agent = await getAgent();
  const first = firstName(agent.full_name);
  const link = "inline-flex min-h-11 items-center gap-3 transition-colors duration-(--dur-ui) hover:text-ink";
  return (
    <footer className="mt-32 border-t border-line bg-panel/40">
      {agent.phone && (
        <Container className="border-b border-line py-12 sm:py-14">
          <Reveal className="flex flex-col gap-3 sm:flex-row">
            <a href={whatsappToAgent(agent.phone, undefined, first)} target="_blank" rel="noopener" className={buttonClass("red", "min-h-14 px-8")}>
              <WhatsAppIcon className="size-5" />
              וואטסאפ ל{first}
            </a>
            <a href={telHref(agent.phone)} className={buttonClass("outline", "min-h-14 px-8")}>
              <PhoneIcon className="size-5" aria-hidden="true" />
              <span dir="ltr">{agent.phone}</span>
            </a>
          </Reveal>
        </Container>
      )}
      <Container className="grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo className="h-12 w-auto" />
          <p className="type-subtitle mt-6">{agent.full_name}</p>
          <p className="mt-1 text-ink-3">
            זכיין {OFFICE.name} · רישיון תיווך {LICENSE}
          </p>
        </div>
        <div>
          <h2 className="label-caps mb-4">פרטים</h2>
          <ul className="space-y-1 text-ink-2">
            {agent.email && (
              <li>
                <a href={`mailto:${agent.email}`} className={link}>
                  <MailIcon className="size-4 text-ink-3" aria-hidden="true" />
                  <span dir="ltr">{agent.email}</span>
                </a>
              </li>
            )}
            {/* Shown once the address is written in content/site.ts (the contact page marks it as missing). */}
            {typeof OFFICE.address === "string" && (
              <li className="flex min-h-11 items-center gap-3">
                <MapPinIcon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                {OFFICE.address}
              </li>
            )}
          </ul>
        </div>
        <nav aria-label="תחתון">
          <h2 className="label-caps mb-4">באתר</h2>
          <ul className="space-y-1 text-ink-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={link}>
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/accessibility" className={link}>
                הצהרת נגישות
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={link}>
                מדיניות פרטיות
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="py-6 text-sm text-ink-3">© {OFFICE.name} | {agent.full_name}</Container>
      </div>
    </footer>
  );
}
