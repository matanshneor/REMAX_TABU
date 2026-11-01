"use client";

import {
  Building2Icon,
  CircleHelpIcon,
  ExternalLinkIcon,
  HandshakeIcon,
  ListChecksIcon,
  LogOutIcon,
  MegaphoneIcon,
  PlusIcon,
  UserCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
};

const MAIN: NavItem[] = [
  { href: "/buyers", label: "קונים", icon: UsersIcon },
  { href: "/properties", label: "מוכרים", icon: Building2Icon },
  { href: "/tasks", label: "משימות", icon: ListChecksIcon },
  { href: "/team", label: "צוות המשרד", icon: UsersRoundIcon },
  { href: AD_TOOL_URL, label: "יצירת מודעת פרסום", icon: MegaphoneIcon, external: true },
  { href: "/help", label: "מדריך", icon: CircleHelpIcon },
];

const ADMIN: NavItem[] = [
  { href: "/deals", label: "עסקאות", icon: HandshakeIcon },
  { href: "/finance", label: "הנהלת חשבונות", icon: WalletIcon },
  { href: "/agents", label: "סוכנים", icon: UserCheckIcon },
];

/** "?new=1" opens the page's "add" dialog (handled by each page). */
const QUICK_ADD = [
  { href: "/buyers?new=1", label: "קונה חדש", icon: UsersIcon },
  { href: "/properties?new=1", label: "מוכר חדש", icon: Building2Icon },
  { href: "/tasks?new=1", label: "משימה חדשה", icon: ListChecksIcon },
];

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
  const router = useRouter();
  const counts = useNavCounts();

  return (
    <div className="flex h-full flex-col">
      <Link href="/buyers" onClick={onNavigate} className="mx-4 mt-4 block rounded-xl bg-white px-3 pt-2.5 pb-2 shadow-sm" aria-label="דף הבית">
        <BrandLogo priority />
        <p className="mt-1 text-center text-[11px] font-medium text-slate-500">פסגת זאב, ירושלים</p>
      </Link>

      <div className="mx-4 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-red text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgb(211_48_58/0.7)] transition-[transform,filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 active:translate-y-px">
            <PlusIcon className="size-4.5" />
            הוספה מהירה
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--anchor-width)">
            {QUICK_ADD.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem
                key={href}
                onClick={() => {
                  router.push(href);
                  onNavigate?.();
                }}
              >
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex flex-1 flex-col gap-6 px-3 pt-6">
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

      <div className="flex items-center gap-1 border-t border-sidebar-border px-2 py-2">
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
      {items.map(({ href, label, icon: Icon, external }) => {
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
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
              active
                ? "bg-primary text-white shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] after:absolute after:inset-y-2 after:end-0 after:w-1 after:rounded-full after:bg-brand-red"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
            )}
          >
            <Icon className="size-5" />
            {label}
            {count != null && count > 0 && (
              <span
                className={cn(
                  "ms-auto me-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                  active ? "bg-brand-red text-white" : "bg-white/10 text-sidebar-foreground",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
