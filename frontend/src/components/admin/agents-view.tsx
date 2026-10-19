"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BanIcon, CheckIcon, MessageCircleIcon, MoreHorizontalIcon, UserCheckIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader, SectionHeader } from "@/components/crm/page-header";
import { StatusBadge } from "@/components/crm/status-badge";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, useAllProfiles } from "@/lib/data";
import { formatDate, formatRelative } from "@/lib/format";
import { ACCOUNT_STATUS, ACTIVE_BUYER_STATUSES, USER_ROLE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Enum, Profile } from "@/lib/types";
import { openWhatsApp } from "@/lib/whatsapp";
import { CandidatesSection } from "./candidates-view";
import { SimpleTable } from "./simple-table";

/**
 * The office team in one place: recruiting candidates on top, then sign-ups waiting
 * for approval (only when there are any), then the office's agents.
 */
export function AgentsView() {
  const { data: all = [], isLoading, error } = useAllProfiles();
  const work = useAgentWork();
  const pending = all.filter((p) => p.status === "pending");
  // Active first; blocked accounts stay listed so they can be let back in.
  const team = all
    .filter((p) => p.status !== "pending")
    .sort((a, b) => Number(a.status !== "active") - Number(b.status !== "active") || a.full_name.localeCompare(b.full_name, "he"));

  return (
    <>
      <PageHeader title="סוכנים" description="גיוס מועמדים וניהול צוות המשרד" />

      <CandidatesSection />

      {pending.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={<UserCheckIcon />} title="ממתינים לאישור" count={pending.length} description="נרשמו לאתר ומחכים לאישור שלך" />
          <ul className="grid gap-3 md:grid-cols-2">
            {pending.map((p) => (
              <PendingCard key={p.id} profile={p} />
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader
          icon={<UsersIcon />}
          title="סוכני המשרד"
          count={team.filter((p) => p.status === "active").length}
          description="כל מי שיש לו גישה למערכת"
        />
        {error ? (
          <ErrorState error={error} />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : team.length === 0 ? (
          <EmptyState icon={<UsersIcon />} title="אין עדיין סוכנים" />
        ) : (
          <SimpleTable
            rows={team}
            onRowClick={() => {}}
            columns={[
              { header: "שם", cell: (p) => p.full_name || "—" },
              { header: "טלפון", cell: (p) => <span dir="ltr">{p.phone || "—"}</span> },
              { header: "אימייל", cell: (p) => <span dir="ltr">{p.email}</span> },
              { header: "תפקיד", cell: (p) => <StatusBadge map={USER_ROLE} value={p.role} /> },
              { header: "הצטרפות", cell: (p) => formatDate(p.join_date) },
              // Each number in its own column, so they can be read at a glance.
              { header: "קונים בטיפול", cell: (p) => <WorkCount value={work.data && (work.data.buyers[p.id] ?? 0)} />, className: "text-center" },
              { header: "נכסים פעילים", cell: (p) => <WorkCount value={work.data && (work.data.properties[p.id] ?? 0)} />, className: "text-center" },
              { header: "עסקאות השנה", cell: (p) => <WorkCount value={work.data && (work.data.deals[p.id] ?? 0)} />, className: "text-center" },
              { header: "סטטוס", cell: (p) => <StatusBadge map={ACCOUNT_STATUS} value={p.status} /> },
              { header: "", cell: (p) => <StatusAction profile={p} />, className: "w-0 text-end" },
            ]}
          />
        )}
      </section>
    </>
  );
}

function PendingCard({ profile }: { profile: Profile }) {
  const setStatus = useSetStatus();
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{profile.full_name}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground" dir="ltr">
            {profile.email}
          </p>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {profile.phone || "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {profile.phone && <WhatsAppButton phone={profile.phone} />}
          <span className="text-xs text-muted-foreground">{formatRelative(profile.created_at)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={setStatus.busy} onClick={() => setStatus.run(profile, "active")}>
          <CheckIcon />
          אישור
        </Button>
        <Button variant="outline" className="flex-1" disabled={setStatus.busy} onClick={() => setStatus.run(profile, "rejected")}>
          <XIcon />
          דחייה
        </Button>
      </div>
    </li>
  );
}

function WorkCount({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">…</span>;
  return <span className={value ? "font-semibold tabular-nums" : "text-muted-foreground tabular-nums"}>{value}</span>;
}

/** How much each agent is handling now: active buyers, active listings, deals closed this year. */
function useAgentWork() {
  return useQuery({
    queryKey: ["agents", "work"],
    queryFn: async () => {
      const supabase = createClient();
      const year = String(new Date().getFullYear());
      const [buyers, properties, deals] = await Promise.all([
        supabase.from("buyers").select("owner_agent_id").in("status", ACTIVE_BUYER_STATUSES),
        supabase.from("properties").select("recruiting_agent_id").eq("status", "active"),
        supabase.from("deals").select("agent_id").gte("closed_on", `${year}-01-01`),
      ]);
      for (const r of [buyers, properties, deals]) if (r.error) throw r.error;
      const tally = (ids: (string | null)[]) =>
        ids.reduce<Record<string, number>>((acc, id) => (id ? { ...acc, [id]: (acc[id] ?? 0) + 1 } : acc), {});
      return {
        buyers: tally(buyers.data!.map((b) => b.owner_agent_id)),
        properties: tally(properties.data!.map((p) => p.recruiting_agent_id)),
        deals: tally(deals.data!.map((d) => d.agent_id)),
      };
    },
  });
}

/**
 * Actions for one agent, tucked into a ⋯ menu so "block" can't be hit by accident.
 * Blocking still asks for confirmation. Never on the admin themself.
 */
function StatusAction({ profile }: { profile: Profile }) {
  const { profile: me } = useAuth();
  const setStatus = useSetStatus();
  const [confirming, setConfirming] = useState(false);
  if (profile.id === me?.id) return null;
  if (profile.status === "rejected") {
    return (
      <Button size="sm" variant="outline" disabled={setStatus.busy} onClick={() => setStatus.run(profile, "active")}>
        אישור
      </Button>
    );
  }
  return (
    <>
      <span onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon-sm" variant="outline" aria-label={`פעולות עבור ${profile.full_name}`} disabled={setStatus.busy} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {profile.phone && (
              <>
                <DropdownMenuItem onClick={() => openWhatsApp(profile.phone)}>
                  <MessageCircleIcon />
                  שליחת וואטסאפ
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
              <BanIcon />
              חסימת גישה…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לחסום את הגישה של {profile.full_name}?</DialogTitle>
            <DialogDescription>לא תהיה יותר כניסה למערכת. הקונים והנכסים של הסוכן נשארים במערכת, ואפשר לאשר את החשבון מחדש בכל רגע.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                setStatus.run(profile, "rejected");
              }}
            >
              כן, לחסום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DONE: Record<Enum<"account_status">, string> = {
  active: "החשבון אושר — הגישה למערכת נפתחה",
  rejected: "החשבון נחסם",
  pending: "",
};

/** Approve / block an account. Stays busy until the lists have refreshed, so a card can't be clicked twice. */
export function useSetStatus() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function run(profile: Profile, status: Enum<"account_status">) {
    setBusy(true);
    const { error } = await createClient().from("profiles").update({ status }).eq("id", profile.id);
    if (error) {
      setBusy(false);
      return toast.error(errorMessage(error));
    }
    await qc.invalidateQueries({ queryKey: ["profiles"] });
    setBusy(false);
    toast.success(`${profile.full_name}: ${DONE[status]}`);
  }
  return { run, busy };
}
