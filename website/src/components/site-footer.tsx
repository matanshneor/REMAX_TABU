import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { LICENSE, OFFICE } from "@/content/site";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { getAgent } from "@/lib/data";
import { WhatsAppIcon } from "./icons";
import { NAV } from "./site-header";
import { Container, Fill, Logo } from "./ui";

export async function SiteFooter() {
  const agent = await getAgent();
  return (
    <footer className="mt-32 border-t border-line bg-panel/40">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo className="h-12 w-auto" />
          <p className="mt-6 font-serif text-2xl font-light">{agent.full_name}</p>
          <p className="mt-1 text-ink-3">
            זכיין {OFFICE.name} · רישיון תיווך {LICENSE}
          </p>
        </div>
        <div>
          <h2 className="label-caps mb-4">יצירת קשר</h2>
          <ul className="space-y-1 text-ink-2">
            {agent.phone && (
              <>
                <li>
                  <a href={telHref(agent.phone)} className="inline-flex min-h-11 items-center gap-3 hover:text-ink">
                    <PhoneIcon className="size-4 text-ink-3" aria-hidden="true" />
                    <span dir="ltr">{agent.phone}</span>
                  </a>
                </li>
                <li>
                  <a href={whatsappToAgent(agent.phone, undefined, firstName(agent.full_name))} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-3 hover:text-ink">
                    <WhatsAppIcon className="size-4 text-ink-3" />
                    וואטסאפ
                  </a>
                </li>
              </>
            )}
            {agent.email && (
              <li>
                <a href={`mailto:${agent.email}`} className="inline-flex min-h-11 items-center gap-3 hover:text-ink">
                  <MailIcon className="size-4 text-ink-3" aria-hidden="true" />
                  <span dir="ltr">{agent.email}</span>
                </a>
              </li>
            )}
            <li className="flex min-h-11 items-center gap-3">
              <MapPinIcon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
              <Fill text={OFFICE.address} />
            </li>
          </ul>
        </div>
        <nav aria-label="תחתון">
          <h2 className="label-caps mb-4">באתר</h2>
          <ul className="space-y-1 text-ink-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/accessibility" className="inline-flex min-h-11 items-center hover:text-ink">
                הצהרת נגישות
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
      <div className="border-t border-line">
        <Container className="py-6 text-sm text-ink-3">© {OFFICE.name}. כל הנכסים באתר מוצעים למכירה דרך {agent.full_name}.</Container>
      </div>
    </footer>
  );
}
