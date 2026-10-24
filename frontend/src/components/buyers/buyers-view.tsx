"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CreateDialog } from "@/components/crm/create-dialog";
import { ExportButton } from "@/components/crm/export-button";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRecruiterName, useTeam } from "@/lib/data";
import { formatILSCompact, formatRelative } from "@/lib/format";
import { StatusBadge } from "@/components/crm/status-badge";
import { BUYER_STATUS, isActiveBuyer, PISGAT_AREAS } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { Buyer, Enum } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { BUYER_SECTIONS, NEW_BUYER } from "./buyer-fields";
import { BuyerPanel } from "./buyer-panel";
import { BuyersKpis } from "./buyers-kpis";
import { DuplicatePhoneWarning } from "./duplicate-phone-warning";
import { MatchBanner } from "./match-banner";

/** Columns shown by default; the rest are in the buyer's card or behind "all columns". */
const COMPACT_COLUMNS = new Set(["name", "status", "contact", "phone", "area", "rooms", "budget", "agent"]);

/** An open buyer with no call logged for this long is marked as neglected. */
const STALE_DAYS = 14;

type BuyerRow = Buyer & { buyer_notes: { created_at: string }[] };

/** Last call in the log, or when the buyer was added if nothing was logged yet. */
const lastContact = (b: BuyerRow) => b.buyer_notes[0]?.created_at ?? b.created_at;
const isStale = (b: BuyerRow) =>
  isActiveBuyer(b) && Date.now() - new Date(lastContact(b)).getTime() > STALE_DAYS * 86_400_000;
const SHOW_ALL_KEY = "buyers:show-all-columns";

/** Admin-only filter: everyone, unassigned leads, or one agent's buyers. */
type AgentFilter = "all" | "unassigned" | (string & {});

export function BuyersView() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const recruiterName = useRecruiterName();
  // The agent column and filter use the team list, so agents who haven't signed up appear too.
  const agentName = useCallback((b: BuyerRow) => recruiterName(b.recruiter_id, b.owner_agent_id), [recruiterName]);
  const { data: team = [] } = useTeam();
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useNewParam();
  const [text, setText] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "stale" | Enum<"buyer_status">>("active");

  const {
    data: buyers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["buyers", "list"],
    queryFn: async (): Promise<BuyerRow[]> => {
      const { data, error } = await createClient()
        .from("buyers")
        .select("*, buyer_notes(created_at)")
        .order("updated_at", { ascending: false })
        // Only the latest call per buyer is needed.
        .order("created_at", { referencedTable: "buyer_notes", ascending: false })
        .limit(1, { referencedTable: "buyer_notes" });
      if (error) throw error;
      return data;
    },
  });

  // RLS already limits agents to their own buyers; the agent filter is for the admin.
  const byOwnership = useMemo(
    () =>
      buyers.filter((b) =>
        agentFilter === "all"
          ? true
          : agentFilter === "unassigned"
            ? !isAssigned(b)
            : b.recruiter_id === agentFilter,
      ),
    [buyers, agentFilter],
  );

  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  // Remembered per browser; storage can be unavailable (private mode), so it's best effort.
  const [showAll, setShowAll] = useState(() => {
    try {
      return localStorage.getItem(SHOW_ALL_KEY) === "1";
    } catch {
      return false;
    }
  });
  function toggleShowAll() {
    const next = !showAll;
    setShowAll(next);
    try {
      localStorage.setItem(SHOW_ALL_KEY, next ? "1" : "0");
    } catch {}
  }

  const filtered = useMemo(() => {
    const t = text.trim().toLowerCase();
    // Phones are saved as 052-123-4567; typed digits should still find them.
    const digits = t.replace(/\D/g, "");
    return byOwnership.filter((b) => {
      if (statusFilter === "active" && !isActiveBuyer(b)) return false;
      if (statusFilter === "stale" && !isStale(b)) return false;
      if (!["all", "active", "stale"].includes(statusFilter) && b.status !== statusFilter) return false;
      if (!t) return true;
      if (digits.length >= 3 && b.phone?.replace(/\D/g, "").includes(digits)) return true;
      return [b.full_name, b.phone, b.email, b.desired_city, ...b.preferred_neighborhoods]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t));
    });
  }, [byOwnership, text, statusFilter]);

  // Default order is "recently updated" (from the query); clicking a header sorts by that column.
  const rows = useMemo(() => {
    const col = sort && COLUMNS.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) =>
      compareValues(col.sortValue!(a, agentName), col.sortValue!(b, agentName), sort!.dir),
    );
  }, [filtered, sort, agentName]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  }

  const columns = COLUMNS.filter((c) => (admin || c.key !== "agent") && (showAll || COMPACT_COLUMNS.has(c.key)));

  return (
    <>
      <PageHeader
        title={admin ? "כל הקונים במשרד" : "הקונים שלי"}
        count={buyers.filter(isActiveBuyer).length}
        description={admin ? "כל הלידים של המשרד, עם התאמה אוטומטית למוכרים בפסגת זאב" : undefined}
        actions={
          <>
            <ExportButton entity="buyers" />
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              קונה חדש
            </Button>
          </>
        }
      />

      {!isLoading && !error && <BuyersKpis buyers={byOwnership} />}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="relative basis-full sm:basis-0 sm:flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="סינון לפי שם, טלפון, מייל או אזור…"
            className="h-10 ps-9"
          />
        </div>

        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-full sm:w-44"
          aria-label="סינון לפי סטטוס"
        >
          {/* Default: only buyers still being worked on. Closed ones stay one click away. */}
          <option value="active">בטיפול ({byOwnership.filter(isActiveBuyer).length})</option>
          <option value="stale">
            מוזנחים — {STALE_DAYS}+ יום בלי שיחה ({byOwnership.filter(isStale).length})
          </option>
          <option value="all">כולל סגורים ({byOwnership.length})</option>
          {Object.entries(BUYER_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label} ({byOwnership.filter((b) => b.status === value).length})
            </option>
          ))}
        </NativeSelect>

        {admin && (
          <NativeSelect
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full sm:w-52"
            aria-label="סינון לפי סוכן"
          >
            <option value="all">כל הסוכנים ({buyers.length})</option>
            <option value="unassigned">לא משויכים ({buyers.filter((b) => !isAssigned(b)).length})</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} ({buyers.filter((b) => b.recruiter_id === t.id).length})
              </option>
            ))}
          </NativeSelect>
        )}

        <Button variant="outline" onClick={toggleShowAll} aria-pressed={showAll} className="h-10 w-full sm:w-auto">
          <Columns3Icon />
          {showAll ? "תצוגה מצומצמת" : "הצג את כל העמודות"}
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={buyers.length ? "אין קונים שמתאימים לסינון" : "עדיין אין קונים במערכת"}
          hint={buyers.length ? "נסה לשנות את הסינון." : "לחץ על ״קונה חדש״ כדי להוסיף את הליד הראשון."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(15_26_46/0.04),0_8px_24px_-14px_rgb(15_26_46/0.12)]">
          <div className="overflow-x-auto">
            <Table
              className={cn(
                "[&_td]:py-3 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th]:leading-tight [&_th]:whitespace-normal",
                // All 15 columns only fit when packed tight; the compact view can breathe.
                showAll ? "text-[13px] [&_td]:px-1 [&_th]:px-1" : "text-sm [&_td]:px-3 [&_th]:px-3",
              )}
            >
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {columns.map((c, i) => (
                    <TableHead
                      key={c.key}
                      className={cn(i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.headClassName)}
                      aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="group/sort inline-flex items-center gap-1 text-start hover:text-foreground"
                        >
                          {c.header}
                          <SortIcon dir={sort?.key === c.key ? sort.dir : null} />
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => setOpenId(b.id)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-secondary/50",
                      openId === b.id && "bg-primary/5 shadow-[inset_-3px_0_0_var(--primary)]",
                    )}
                  >
                    {columns.map((c, i) => (
                      <TableCell
                        key={c.key}
                        className={cn(i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.className?.(b))}
                      >
                        {c.cell(b, agentName)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              מציג <strong className="text-foreground tabular-nums">{rows.length}</strong> מתוך{" "}
              <strong className="text-foreground tabular-nums">{buyers.length}</strong> קונים
            </span>
            <span>
              {showAll ? "" : "מייל, קומה, דרישות ומימון מופיעים בכרטיס הקונה · "}לחץ על כותרת עמודה כדי למיין
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && <MatchBanner buyers={byOwnership.filter(isActiveBuyer)} onOpen={setOpenId} />}

      <CreateDialog<Buyer>
        open={creating}
        onOpenChange={setCreating}
        title="קונה חדש"
        table="buyers"
        // The admin can hand the new buyer to anyone on the team; agents keep what they enter.
        sections={admin ? ADMIN_CREATE_SECTIONS : BUYER_SECTIONS}
        initial={NEW_BUYER}
        // Whoever enters a buyer owns it (also the DB default); a chosen recruiter overrides it.
        extra={{ owner_agent_id: profile?.id }}
        onCreated={(b) => setOpenId(b.id)}
        renderExtra={(values) => (
          <DuplicatePhoneWarning
            phone={String(values.phone ?? "")}
            onOpen={(id) => {
              setCreating(false);
              setOpenId(id);
            }}
          />
        )}
      />
      <BuyerPanel id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

type Column = {
  key: string;
  header: string;
  headClassName?: string;
  className?: (b: BuyerRow) => string | undefined;
  cell: (b: BuyerRow, agentName: AgentNameFn) => React.ReactNode;
  /** Makes the column sortable by clicking its header. */
  sortValue?: (b: BuyerRow, agentName: AgentNameFn) => string | number | null;
};

type AgentNameFn = (b: BuyerRow) => string;

/** Assigned to someone on the team (signed up or not). */
const isAssigned = (b: BuyerRow) => !!(b.recruiter_id || b.owner_agent_id);

const ADMIN_CREATE_SECTIONS = [
  { fields: [{ name: "recruiter_id", label: "סוכן מגייס (מטפל)", type: "team" as const, span: 6 as const }] },
  ...BUYER_SECTIONS,
];

/** Ascending/descending compare; empty values always go last. */
function compareValues(a: string | number | null, b: string | number | null, dir: 1 | -1): number {
  if (a == null || a === "") return b == null || b === "" ? 0 : 1;
  if (b == null || b === "") return -1;
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "he");
  return result * dir;
}

function SortIcon({ dir }: { dir: 1 | -1 | null }) {
  if (dir === 1) return <ArrowUpIcon className="size-3 text-primary" />;
  if (dir === -1) return <ArrowDownIcon className="size-3 text-primary" />;
  return <ArrowUpDownIcon className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-50" />;
}

/** Buyers table columns, in display order (right to left). Change the order here. */
const COLUMNS: Column[] = [
  {
    key: "name",
    header: "שם",
    className: () => "font-medium",
    sortValue: (b) => b.full_name,
    cell: (b) => (
      <span className="flex items-center gap-2.5">
        <BuyerAvatar name={b.full_name} />
        <span className="min-w-0">
          <span className="block font-semibold">{b.full_name}</span>
          <BuyerSubtitle buyer={b} />
        </span>
      </span>
    ),
  },
  {
    key: "status",
    header: "סטטוס",
    sortValue: (b) => Object.keys(BUYER_STATUS).indexOf(b.status),
    cell: (b) => <StatusBadge map={BUYER_STATUS} value={b.status} />,
  },
  {
    key: "contact",
    header: "שיחה אחרונה",
    sortValue: (b) => new Date(lastContact(b)).getTime(),
    cell: (b) => <LastContact buyer={b} />,
  },
  {
    key: "phone",
    header: "טלפון",
    className: () => "text-muted-foreground",
    cell: (b) => (
      <div className="flex items-center gap-1.5">
        <span dir="ltr" className="tabular-nums">
          {b.phone ?? "—"}
        </span>
        <WhatsAppButton phone={b.phone} size="icon-sm" solid label={`וואטסאפ ל${b.full_name}`} />
      </div>
    ),
  },
  {
    key: "email",
    header: "מייל",
    className: () => "max-w-28 text-muted-foreground",
    // LTR block so a long address is cut at its end ("avi@exam…"), not its start.
    cell: (b) => (
      <span dir="ltr" title={b.email ?? undefined} className="block truncate text-end">
        {b.email ?? "—"}
      </span>
    ),
  },
  {
    key: "area",
    header: "אזור בפסגה",
    headClassName: "w-16",
    cell: (b) => <AreaTags areas={b.preferred_neighborhoods} />,
  },
  {
    key: "rooms",
    header: "חדרים",
    className: () => "tabular-nums",
    sortValue: (b) => b.min_rooms,
    cell: (b) =>
      b.min_rooms ? (
        <span className="font-medium">
          <span dir="ltr">{b.min_rooms}+</span> חד׳
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "budget",
    header: "תקציב",
    className: () => "tabular-nums",
    sortValue: (b) => b.max_budget,
    cell: (b) => <span className="font-semibold text-primary">{formatILSCompact(b.max_budget)}</span>,
  },
  {
    key: "floor",
    header: "קומה",
    className: () => "tabular-nums",
    sortValue: (b) => b.floor_min ?? b.floor_max,
    cell: (b) => floorRange(b.floor_min, b.floor_max),
  },
  { key: "elevator", header: "מעלית", cell: (b) => <Need value={b.needs_elevator} /> },
  { key: "balcony", header: "מרפסת", cell: (b) => <Need value={b.needs_balcony} /> },
  { key: "safe_room", header: "ממ״ד", cell: (b) => <Need value={b.needs_safe_room} /> },
  { key: "sold", header: "מכר דירה", headClassName: "w-12", cell: (b) => <YesNo value={b.sold_apartment} /> },
  {
    key: "mortgage",
    header: "משכנתא מאושרת",
    headClassName: "w-16",
    cell: (b) => <YesNo value={b.mortgage_approved} />,
  },
  {
    key: "equity",
    header: "הון עצמי",
    headClassName: "w-16",
    className: () => "tabular-nums",
    sortValue: (b) => b.equity,
    cell: (b) => formatILSCompact(b.equity),
  },
  {
    // Admin only (filtered out for agents)
    key: "agent",
    header: "סוכן",
    className: (b) => (isAssigned(b) ? undefined : "font-medium text-brand-red"),
    sortValue: (b, agentName) => (isAssigned(b) ? agentName(b) : null),
    cell: (b, agentName) => (isAssigned(b) ? agentName(b) : "לא משויך"),
  },
];

function LastContact({ buyer }: { buyer: BuyerRow }) {
  const logged = buyer.buyer_notes.length > 0;
  const stale = isStale(buyer);
  return (
    <span
      title={logged ? undefined : "עדיין לא נרשמה שיחה ביומן — נספר מיום ההוספה"}
      className={cn("whitespace-nowrap text-xs", stale ? "font-semibold text-brand-red" : "text-muted-foreground")}
    >
      {stale && "● "}
      {logged ? formatRelative(lastContact(buyer)) : "אין שיחות"}
    </span>
  );
}

function BuyerAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-primary/10"
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  const parts = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/** Second line under the name: the start of the notes. */
function BuyerSubtitle({ buyer }: { buyer: Buyer }) {
  const note = buyer.notes?.split("\n")[0];
  return note ? <span className="block max-w-36 truncate text-xs text-muted-foreground">{note}</span> : null;
}

function AreaTags({ areas }: { areas: string[] }) {
  if (!areas.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {areas.map((a) => (
        <span
          key={a}
          className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
        >
          {AREA_SHORT.get(a) ?? a}
        </span>
      ))}
    </span>
  );
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="font-medium text-emerald-700">כן</span>
  ) : (
    <span className="text-muted-foreground">לא</span>
  );
}

function Need({ value }: { value: Enum<"requirement"> }) {
  if (value === "must")
    return <span className="rounded-md bg-sidebar px-1.5 py-0.5 text-[11px] font-semibold text-white">חובה</span>;
  if (value === "nice")
    return (
      <span className="rounded-md border border-primary/40 px-1.5 py-0.5 text-[11px] font-medium text-primary">
        רצוי
      </span>
    );
  return <span className="text-muted-foreground">—</span>;
}

function floorRange(min: number | null, max: number | null): React.ReactNode {
  // Numeric ranges are wrapped LTR so "1–6" doesn't flip to "6–1" in RTL.
  if (min != null && max != null) return min === max ? `${min}` : <span dir="ltr">{`${min}–${max}`}</span>;
  if (min != null) return `מ-${min} ומעלה`;
  if (max != null) return `עד ${max}`;
  return "—";
}

const AREA_SHORT = new Map(PISGAT_AREAS.map((a) => [a.value, a.label]));
