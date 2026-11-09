"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon, PhoneIcon, PlusIcon, SearchIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ExportButton } from "@/components/crm/export-button";
import { FilterBar, FilterChip, FilterDivider } from "@/components/crm/filter-bar";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/form/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRecruiterName, useTeam } from "@/lib/data";
import { formatDate, formatILSCompact, formatRelative } from "@/lib/format";
import { matchBuyerToProperty } from "@/lib/matching";
import { useOfficeListings } from "@/components/matching/office-listings";
import { StatusBadge } from "@/components/crm/status-badge";
import { BUYER_STATUS, isActiveBuyer, PISGAT_AREAS, PROPERTY_TYPES, sourceKind, sourceOptions } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { Buyer, Enum } from "@/lib/types";
import { useNewParam, usePanelParam } from "@/lib/use-panel-param";
import { cn } from "@/lib/utils";
import { BuyerPanel } from "./buyer-panel";

/** Columns shown by default (the agent column is the admin's only); the rest are in the buyer's card or behind "all columns". */
const COMPACT_COLUMNS = new Set(["name", "agent", "rooms", "area", "budget", "matches", "added", "log", "phone"]);

/** An open buyer with no call logged for this long is marked as neglected. */
const STALE_DAYS = 14;

type BuyerRow = Buyer & { buyer_notes: { created_at: string }[] };

/** Last call in the log, or when the buyer was added if nothing was logged yet. */
const lastContact = (b: BuyerRow) => b.buyer_notes[0]?.created_at ?? b.created_at;
const isStale = (b: BuyerRow) =>
  isActiveBuyer(b) && Date.now() - new Date(lastContact(b)).getTime() > STALE_DAYS * 86_400_000;
/** Whole days since a date (for "18 יום בלי שיחה"). */
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const SHOW_ALL_KEY = "buyers:show-all-columns";

type StatusFilter = "all" | "active" | Enum<"buyer_status">;

/**
 * "סטטוס" under "סינונים", with the same statuses as the buyer's card. Untouched, it shows
 * the buyers still looking (חדש, חם, פושר); "כל הסטטוסים" adds those who already bought.
 */
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "סטטוס" },
  ...Object.entries(BUYER_STATUS).map(([value, { label }]) => ({ value: value as StatusFilter, label })),
  { value: "all", label: "כל הסטטוסים" },
];

/** Admin-only filter: everyone, unassigned leads, or one agent's buyers. */
type AgentFilter = "all" | "unassigned" | (string & {});

/** Filters behind "עוד סינונים". */
type MoreFilters = {
  area: string;
  type: string;
  budgetMin: string;
  budgetMax: string;
  roomsMin: string;
  source: string;
  safeRoom: boolean;
  balcony: boolean;
  elevator: boolean;
  mortgage: boolean;
  sold: boolean;
};
const NO_MORE_FILTERS: MoreFilters = {
  area: "",
  type: "",
  budgetMin: "",
  budgetMax: "",
  roomsMin: "",
  source: "",
  safeRoom: false,
  balcony: false,
  elevator: false,
  mortgage: false,
  sold: false,
};
/** On/off filters: "needs ..." means the buyer marked it as a must. */
const MORE_TOGGLES: [keyof MoreFilters, string][] = [
  ["safeRoom", "חייב ממ״ד"],
  ["balcony", "חייב מרפסת"],
  ["elevator", "חייב מעלית"],
  ["mortgage", "משכנתא מאושרת"],
  ["sold", "מכר דירה"],
];

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [more, setMore] = useState(NO_MORE_FILTERS);
  const setMoreFilter = <K extends keyof MoreFilters>(k: K, v: MoreFilters[K]) => setMore((m) => ({ ...m, [k]: v }));
  const moreCount =
    (Object.keys(NO_MORE_FILTERS) as (keyof MoreFilters)[]).filter((k) => more[k] !== NO_MORE_FILTERS[k]).length +
    (statusFilter !== "active" ? 1 : 0) +
    (agentFilter !== "all" ? 1 : 0);
  const filtering = text !== "" || agentFilter !== "all" || statusFilter !== "active" || moreCount > 0;
  function resetFilters() {
    setText("");
    setAgentFilter("all");
    setStatusFilter("active");
    setMore(NO_MORE_FILTERS);
  }

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

  // How many offered properties (the whole office's) fit each buyer: shown in the row.
  const { data: listings = [] } = useOfficeListings();
  const matches = useMemo(
    () => new Map(buyers.map((b) => [b.id, isActiveBuyer(b) ? listings.filter((p) => matchBuyerToProperty(b, p).ok).length : 0])),
    [buyers, listings],
  );
  // "רישום שיחה" on a row opens the buyer with the cursor in the call log.
  const [focusLog, setFocusLog] = useState(false);
  const ctx = useMemo(() => ({ agentName, matches }), [agentName, matches]);
  const onLog = (id: string) => {
    setFocusLog(true);
    setOpenId(id);
  };

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
    const num = (v: string) => (v === "" ? null : Number(v));
    const [budgetMin, budgetMax, roomsMin] = [num(more.budgetMin), num(more.budgetMax), num(more.roomsMin)];
    return byOwnership.filter((b) => {
      if (statusFilter === "active" && !isActiveBuyer(b)) return false;
      if (!["all", "active"].includes(statusFilter) && b.status !== statusFilter) return false;
      if (more.area && !b.preferred_neighborhoods.includes(more.area)) return false;
      if (more.type && b.property_type !== more.type) return false;
      if (budgetMin != null && (b.max_budget ?? 0) < budgetMin) return false;
      if (budgetMax != null && (b.max_budget ?? Infinity) > budgetMax) return false;
      if (roomsMin != null && (b.min_rooms ?? 0) < roomsMin) return false;
      if (more.source && sourceKind(b.lead_source) !== more.source) return false;
      if (more.safeRoom && b.needs_safe_room !== "must") return false;
      if (more.balcony && b.needs_balcony !== "must") return false;
      if (more.elevator && b.needs_elevator !== "must") return false;
      if (more.mortgage && !b.mortgage_approved) return false;
      if (more.sold && !b.sold_apartment) return false;
      if (!t) return true;
      if (digits.length >= 3 && b.phone?.replace(/\D/g, "").includes(digits)) return true;
      return [b.full_name, b.phone, b.email, b.desired_city, ...b.preferred_neighborhoods]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t));
    });
  }, [byOwnership, text, statusFilter, more]);

  // Default order is "recently updated" (from the query); clicking a header sorts by that column.
  const rows = useMemo(() => {
    const col = sort && COLUMNS.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) =>
      compareValues(col.sortValue!(a, ctx), col.sortValue!(b, ctx), sort!.dir),
    );
  }, [filtered, sort, ctx]);

  function toggleSort(key: string) {
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  }

  const columns = COLUMNS.filter((c) => (admin || c.key !== "agent") && (showAll || COMPACT_COLUMNS.has(c.key)));

  return (
    <>
      <PageHeader
        title={admin ? "קונים" : "הקונים שלי"}
        count={buyers.filter(isActiveBuyer).length}
        actions={
          <>
            <ExportButton entity="buyers" />
            <Button
              onClick={() => {
                setOpenId(null);
                setCreating(true);
              }}
            >
              <PlusIcon />
              קונה חדש
            </Button>
          </>
        }
      />

      <FilterBar
        className="border-0 bg-transparent p-0 shadow-none"
        moreCount={moreCount}
        onReset={filtering ? resetFilters : undefined}
        more={
          <>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="סטטוס"
              className="w-full sm:w-40"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            {admin && (
              <NativeSelect value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="w-full sm:w-44" aria-label="סינון לפי סוכן">
                <option value="all">כל הסוכנים ({buyers.length})</option>
                <option value="unassigned">לא משויכים ({buyers.filter((b) => !isAssigned(b)).length})</option>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({buyers.filter((b) => b.recruiter_id === t.id).length})
                  </option>
                ))}
              </NativeSelect>
            )}
            <NativeSelect value={more.area} onChange={(e) => setMoreFilter("area", e.target.value)} aria-label="אזור" className="w-full sm:w-32">
              <option value="">כל האזורים</option>
              {PISGAT_AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.value}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={more.type} onChange={(e) => setMoreFilter("type", e.target.value)} aria-label="סוג נכס" className="w-full sm:w-28">
              <option value="">כל הסוגים</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <div className="flex w-full items-center gap-1 sm:w-auto">
              <CurrencyInput value={more.budgetMin} onChange={(v) => setMoreFilter("budgetMin", v)} placeholder="תקציב מ-" aria-label="תקציב מינימלי" className="w-full sm:w-28" />
              <span className="text-muted-foreground">–</span>
              <CurrencyInput value={more.budgetMax} onChange={(v) => setMoreFilter("budgetMax", v)} placeholder="עד" aria-label="תקציב מקסימלי" className="w-24" />
            </div>
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              חדרים מ-
              <Input type="number" min={0} step={0.5} value={more.roomsMin} onChange={(e) => setMoreFilter("roomsMin", e.target.value)} className="w-16" />
            </Label>
            <NativeSelect value={more.source} onChange={(e) => setMoreFilter("source", e.target.value)} aria-label="מקור ליד" className="w-full sm:w-36">
              <option value="">כל מקורות הליד</option>
              {sourceOptions(buyers.map((b) => b.lead_source)).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            <FilterDivider />
            {MORE_TOGGLES.map(([k, label]) => (
              <FilterChip key={k} on={!!more[k]} onClick={() => setMoreFilter(k, !more[k])}>
                {label}
              </FilterChip>
            ))}
            <FilterDivider />
            <FilterChip on={showAll} onClick={toggleShowAll}>
              <Columns3Icon className="size-3.5" />
              כל העמודות
            </FilterChip>
          </>
        }
      >
        <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="חיפוש שם, טלפון, מייל או אזור…"
            className="bg-card ps-9"
          />
        </div>
      </FilterBar>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title={buyers.length ? "אין קונים שמתאימים לסינון" : "עדיין אין קונים במערכת"}
          hint={buyers.length ? "אפשר לשנות את הסינון." : "לוחצים על ״קונה חדש״ כדי להוסיף את הליד הראשון."}
        />
      ) : (
        <>
        {/* Phones: one card per buyer, with big call / WhatsApp / log buttons, instead of a wide table. */}
        <ul className="flex flex-col gap-2.5 md:hidden">
          {rows.map((b) => {
            const n = matches.get(b.id);
            return (
              <li key={b.id} className="rounded-xl border bg-card p-3.5 shadow-card">
                <button
                  type="button"
                  onClick={() => {
                    setFocusLog(false);
                    setOpenId(b.id);
                  }}
                  className="block w-full rounded-lg text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-base font-semibold">{b.full_name}</span>
                    <span className="shrink-0 font-display text-lg text-primary tabular-nums">{formatILSCompact(b.max_budget)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {[b.min_rooms && `${b.min_rooms}+ חד׳`, b.preferred_neighborhoods.length ? areasText(b.preferred_neighborhoods) : "כל הפסגה"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {isStale(b) && (
                    <span className="mt-0.5 block text-sm font-semibold text-brand-red">● {daysSince(lastContact(b))} יום בלי שיחה</span>
                  )}
                  {!!n && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      <SparklesIcon className="size-3" />
                      {n === 1 ? "נכס אחד מתאים" : `${n} נכסים מתאימים`}
                    </span>
                  )}
                </button>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {b.phone ? (
                    <>
                      <WhatsAppButton phone={b.phone} solid label="וואטסאפ" />
                      <Button variant="outline" render={<a href={`tel:${b.phone}`} />} nativeButton={false}>
                        <PhoneIcon />
                        חיוג
                      </Button>
                    </>
                  ) : (
                    <span className="col-span-2 self-center text-sm text-muted-foreground">אין טלפון</span>
                  )}
                  <Button variant="outline" className="border-dashed border-primary/40 bg-secondary/40 text-primary" onClick={() => onLog(b.id)}>
                    <PlusIcon />
                    שיחה
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
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
                    onClick={() => {
                      setFocusLog(false);
                      setOpenId(b.id);
                    }}
                    // Keyboard: Tab reaches the row, Enter opens the buyer (buttons inside keep their own keys).
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setFocusLog(false);
                        setOpenId(b.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer transition-colors outline-none hover:bg-secondary/50 focus-visible:bg-secondary/60 focus-visible:shadow-[inset_-3px_0_0_var(--ring)]",
                      openId === b.id && "bg-primary/5 shadow-[inset_-3px_0_0_var(--primary)]",
                    )}
                  >
                    {columns.map((c, i) => (
                      <TableCell
                        key={c.key}
                        className={cn(i === 0 && "ps-4", i === columns.length - 1 && "pe-4", c.className?.(b))}
                      >
                        {c.cell(b, { ...ctx, onLog })}
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
              {showAll ? "" : "שאר הפרטים בכרטיס הקונה · "}לוחצים על כותרת עמודה כדי למיין
            </span>
          </div>
        </div>
        </>
      )}

      <BuyerPanel
        id={openId}
        creating={creating}
        focusLog={focusLog}
        onClose={() => {
          setCreating(false);
          setFocusLog(false);
          setOpenId(null);
        }}
        onCreated={(id) => {
          setCreating(false);
          setOpenId(id);
        }}
      />
    </>
  );
}

type Column = {
  key: string;
  header: string;
  headClassName?: string;
  className?: (b: BuyerRow) => string | undefined;
  cell: (b: BuyerRow, ctx: RowContext) => React.ReactNode;
  /** Makes the column sortable by clicking its header. */
  sortValue?: (b: BuyerRow, ctx: RowContext) => string | number | null;
};

type RowContext = {
  agentName: (b: BuyerRow) => string;
  /** Offered properties that fit the buyer, by buyer id. */
  matches: Map<string, number>;
  /** Opens the buyer ready to log a call (cells only; sorting doesn't need it). */
  onLog?: (id: string) => void;
};

/** Assigned to someone on the team (signed up or not). */
const isAssigned = (b: BuyerRow) => !!(b.recruiter_id || b.owner_agent_id);

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
    header: "קונה",
    className: () => "font-medium",
    sortValue: (b) => b.full_name,
    cell: (b) => (
      <>
        <span className="block font-semibold">{b.full_name}</span>
        {/* Neglected: in words too, not only in red. */}
        {isStale(b) && (
          <span className="block text-xs font-semibold text-brand-red">● {daysSince(lastContact(b))} יום בלי שיחה</span>
        )}
      </>
    ),
  },
  {
    // Admin only (filtered out for agents)
    key: "agent",
    header: "סוכן מגייס",
    className: (b) => cn("whitespace-nowrap", !isAssigned(b) && "font-medium text-brand-red"),
    sortValue: (b, { agentName }) => (isAssigned(b) ? agentName(b) : null),
    cell: (b, { agentName }) => (isAssigned(b) ? agentName(b) : "לא משויך"),
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
    key: "area",
    header: "אזור בפסגה",
    className: () => "whitespace-nowrap",
    cell: (b) => <AreaTags areas={b.preferred_neighborhoods} />,
  },
  {
    key: "budget",
    header: "תקציב",
    className: () => "tabular-nums",
    sortValue: (b) => b.max_budget,
    cell: (b) => <span className="font-semibold text-primary">{formatILSCompact(b.max_budget)}</span>,
  },
  {
    key: "matches",
    header: "התאמות",
    sortValue: (b, { matches }) => matches.get(b.id) || null,
    cell: (b, { matches }) => {
      const n = matches.get(b.id);
      return n ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
          <SparklesIcon className="size-3" />
          {n === 1 ? "נכס אחד מתאים" : `${n} נכסים מתאימים`}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    key: "added",
    header: "נוסף בתאריך",
    className: () => "whitespace-nowrap text-muted-foreground tabular-nums",
    sortValue: (b) => new Date(b.created_at).getTime(),
    cell: (b) => formatDate(b.created_at),
  },
  {
    key: "log",
    header: "",
    cell: (b, { onLog }) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLog?.(b.id);
        }}
        className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-dashed border-primary/40 bg-secondary/40 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <PlusIcon className="size-3.5" />
        רישום שיחה
      </button>
    ),
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
        {b.phone && (
          <Button
            variant="outline"
            size="icon-sm"
            render={<a href={`tel:${b.phone}`} onClick={(e) => e.stopPropagation()} />}
            nativeButton={false}
            aria-label={`חיוג ל${b.full_name}`}
            title={`חיוג ל${b.full_name}`}
          >
            <PhoneIcon />
          </Button>
        )}
        <WhatsAppButton phone={b.phone} size="icon-sm" solid label={`וואטסאפ ל${b.full_name}`} />
      </div>
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

/** Areas as plain text ("מרכז, מזרח"); all of them reads "כל הפסגה". */
/** "מרכז, מזרח"; all of them reads "כל הפסגה". */
function areasText(areas: string[]): string {
  if (PISGAT_AREAS.every((a) => areas.includes(a.value))) return "כל הפסגה";
  return areas.map((a) => AREA_SHORT.get(a) ?? a).join(", ");
}

function AreaTags({ areas }: { areas: string[] }) {
  if (!areas.length) return <span className="text-muted-foreground">—</span>;
  return <>{areasText(areas)}</>;
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
