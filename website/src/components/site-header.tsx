import { PhoneIcon } from "lucide-react";
import Link from "next/link";
import { firstName, telHref, whatsappToAgent } from "@/lib/contact";
import { getAgent } from "@/lib/data";
import { WhatsAppIcon } from "./icons";
import { MobileNav } from "./mobile-nav";
import { buttonClass, cn, Container, Logo, PRESS } from "./ui";

export const NAV = [
  { href: "/#listings", label: "נכסים" },
  { href: "/about", label: "המשרד שלנו" },
  { href: "/contact", label: "צור קשר" },
];

export async function SiteHeader() {
  const agent = await getAgent();
  const wa = agent.phone ? whatsappToAgent(agent.phone, undefined, firstName(agent.full_name)) : null;
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line/70 bg-night/90 backdrop-blur-md">
      <a
        href="#main"
        className="absolute start-4 top-2 z-50 -translate-y-24 bg-ink px-4 py-3 font-medium text-night focus:translate-y-0"
      >
        דילוג לתוכן
      </a>
      <Container className="flex h-16 items-center gap-4 sm:h-20">
        <Link href="/" className="flex min-h-11 items-center gap-4">
          <Logo preload sizes="360px" className="h-10 w-auto sm:h-14" />
          <span className="hidden border-s border-line-strong ps-4 font-serif text-lg leading-tight sm:block">פסגת זאב, ירושלים</span>
        </Link>
        <nav aria-label="ראשי" className="ms-auto hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center text-ink-2 transition-colors duration-(--dur-ui) hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* For those who would rather call: the number itself, on screens with room for it. */}
        {agent.phone && (
          <a
            href={telHref(agent.phone)}
            className="hidden min-h-11 items-center gap-2 ps-4 text-ink-2 transition-colors duration-(--dur-ui) hover:text-ink lg:inline-flex"
          >
            <PhoneIcon className="size-4" aria-hidden="true" />
            <span dir="ltr">{agent.phone}</span>
          </a>
        )}
        {wa && (
          <div className="ms-auto hidden sm:block md:ms-0">
            <a href={wa} target="_blank" rel="noopener" className={buttonClass("red", "px-5")}>
              <WhatsAppIcon className="size-5" />
              וואטסאפ
            </a>
          </div>
        )}
        <div className="ms-auto flex items-center gap-2 sm:ms-0 md:hidden">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" aria-label="וואטסאפ למשה" className={cn("inline-flex size-11 items-center justify-center bg-red text-white sm:hidden", PRESS)}>
              <WhatsAppIcon className="size-5" />
            </a>
          )}
          <MobileNav items={NAV} />
        </div>
      </Container>
    </header>
  );
}
