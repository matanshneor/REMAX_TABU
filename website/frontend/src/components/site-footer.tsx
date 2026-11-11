import { ClockIcon, MailIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { OFFICE } from "@/content/site";
import { getAgent } from "@/lib/data";
import { NAV } from "./site-header";
import { Container, Logo } from "./ui";

/**
 * Every page ends here: the office's details, the site links and the legal pages.
 */
export async function SiteFooter() {
  const agent = await getAgent();
  const link = "inline-flex min-h-11 items-center gap-3 transition-colors duration-(--dur-ui) hover:text-ink";
  return (
    <footer className="mt-32 border-t border-line bg-panel/40">
      <Container className="grid gap-10 py-14 sm:gap-12 sm:py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        {/* The logo already names the office, so only the slogan stands under it. */}
        <div>
          <Logo className="h-12 w-auto" />
          <p className="accent-line type-subtitle mt-8 text-ink">{OFFICE.tagline}</p>
        </div>
        <div>
          <h2 className="label-caps mb-4">פרטים</h2>
          <ul className="space-y-1 text-ink-2">
            {/* Shown once written in content/site.ts (the contact page marks them as missing). */}
            {typeof OFFICE.address === "string" && (
              <li className="flex min-h-11 items-center gap-3">
                <MapPinIcon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                {OFFICE.address}
              </li>
            )}
            {typeof OFFICE.hours === "string" && (
              <li className="flex min-h-11 items-center gap-3">
                <ClockIcon className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                {OFFICE.hours}
              </li>
            )}
            {agent.email && (
              <li>
                <a href={`mailto:${agent.email}`} className={link}>
                  <MailIcon className="size-4 text-ink-3" aria-hidden="true" />
                  <span dir="ltr">{agent.email}</span>
                </a>
              </li>
            )}
          </ul>
        </div>
        <nav aria-label="תחתון">
          <h2 className="label-caps mb-4">עוד באתר</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-ink-2 sm:grid-cols-1">
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
        <Container className="py-6 text-sm text-ink-3">© {OFFICE.name}</Container>
      </div>
    </footer>
  );
}
