"use client";

import {
  Building2Icon,
  ExternalLinkIcon,
  HandshakeIcon,
  ListChecksIcon,
  LogOutIcon,
  MegaphoneIcon,
  UserCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { AD_TOOL_URL } from "@/lib/ad-tool";
import { USER_ROLE } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useNavCounts } from "./nav-counts";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Another site: opens in a new tab. */
  external?: boolean;
  /** A second, smaller line under the label, from the item's count (shown only when there is one). */
  hint?: (count: number) => string;
};

/** Yad2's orange tag, in place of an icon (sized by its text, like the tag on the pool's cards). */
function Yad2Mark() {
  return <span className="shrink-0 rounded-md bg-[#ff7100] px-1.5 py-px text-xs leading-snug font-extrabold text-white">יד2</span>;
}

const MAIN: NavItem[] = [
  { href: "/buyers", label: "קונים", icon: UsersIcon },
  { href: "/properties", label: "מוכרים", icon: Building2Icon },
  { href: "/tasks", label: "משימות", icon: ListChecksIcon },
  { href: "/team", label: "צוות המשרד", icon: UsersRoundIcon },
  { href: AD_TOOL_URL, label: "יצירת מודעת פרסום", icon: MegaphoneIcon, external: true },
  {
    href: "/market",
    label: "מאגר יד 2",
    icon: Yad2Mark,
    hint: (n) => (n === 1 ? "מודעה חדשה אחת לגיוס" : `${n} מודעות חדשות לגיוס`),
  },
];

const ADMIN: NavItem[] = [
  { href: "/deals", label: "עסקאות", icon: HandshakeIcon },
  { href: "/finance", label: "הנהלת חשבונות", icon: WalletIcon },
  { href: "/agents", label: "ניהול סוכנים", icon: UserCheckIcon },
];

/** Counts that need the user (sign-ups waiting for approval) get a red badge; the rest are a quiet tally. */
const ALERTS = new Set(["/agents"]);

/** Fixed menu on desktop; on smaller screens the same content opens from the header's ☰ button. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <SidebarContent />
    </aside>
  );
}

/** `onNavigate` closes the mobile menu after a link is chosen. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const counts = useNavCounts();

  return (
    <div className="flex h-full flex-col">
      <Link href="/buyers" onClick={onNavigate} className="mx-4 mt-4 block rounded-xl bg-white px-3 pt-2.5 pb-2 shadow-sm" aria-label="דף הבית">
        <BrandLogo priority />
        <p className="mt-1 text-center text-[11px] font-medium text-slate-500">פסגת זאב, ירושלים</p>
      </Link>

      {/* Scrolls on short screens, so the account row below is never cut off. */}
      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
        <NavGroup
          items={MAIN}
          pathname={pathname}
          counts={counts}
          onNavigate={onNavigate}
        />
        {isAdmin(profile) && (
          <NavGroup title="ניהול" items={ADMIN} pathname={pathname} counts={counts} onNavigate={onNavigate} />
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-1 border-t border-sidebar-border px-2 py-2">
        <Link
          href="/account"
          onClick={onNavigate}
          title="החשבון שלי"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60",
            pathname.startsWith("/account") && "bg-sidebar-accent",
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white ring-2 ring-white/20">
            {profile?.full_name?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60">{profile ? USER_ROLE[profile.role].label : ""}</p>
          </div>
        </Link>
        <button
          onClick={signOut}
          aria-label="התנתקות"
          title="התנתקות"
          className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white"
        >
          <LogOutIcon className="size-4 rtl:-scale-x-100" />
        </button>
      </div>
    </div>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  counts,
  onNavigate,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
  counts: Record<string, number | undefined>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {title && <p className="mb-1 px-3 text-xs font-medium text-sidebar-foreground/50">{title}</p>}
      {items.map(({ href, label, icon: Icon, external, hint }) => {
        if (external) {
          return (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener"
              onClick={onNavigate}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
            >
              <Icon className="size-5" />
              {label}
              <ExternalLinkIcon aria-label="נפתח בלשונית חדשה" className="ms-auto me-1 size-3.5 opacity-60" />
            </a>
          );
        }
        const active = pathname.startsWith(href);
        const count = counts[href];
        const sub = hint && count ? hint(count) : null;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 py-1 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
              active
                ? "bg-primary text-white shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] after:absolute after:inset-y-2 after:end-0 after:w-1 after:rounded-full after:bg-brand-red"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
            )}
          >
            <Icon className="size-5 shrink-0" />
            {sub ? (
              <span className="flex flex-col leading-tight">
                {label}
                <span className={cn("text-xs font-normal", active ? "text-white/70" : "text-[#ffb37a]")}>{sub}</span>
              </span>
            ) : (
              label
            )}
            {!sub && count != null && count > 0 &&
              (ALERTS.has(href) ? (
                <span className="ms-auto me-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-red px-1.5 text-xs font-semibold text-white tabular-nums">
                  {count}
                </span>
              ) : (
                <span className={cn("ms-auto me-1.5 text-sm font-normal tabular-nums", active ? "text-white/60" : "text-sidebar-foreground/50")}>
                  {count}
                </span>
              ))}
          </Link>
        );
      })}
    </div>
  );
}
