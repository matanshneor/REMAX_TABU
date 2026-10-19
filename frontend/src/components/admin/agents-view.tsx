"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, UserCheckIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, ErrorState, PageHeader, SectionHeader } from "@/components/crm/page-header";
import { StatusBadge } from "@/components/crm/status-badge";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, useAllProfiles } from "@/lib/data";
import { formatDate, formatRelative } from "@/lib/format";
import { ACCOUNT_STATUS, USER_ROLE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Enum, Profile } from "@/lib/types";
import { CandidatesSection } from "./candidates-view";
import { SimpleTable } from "./simple-table";

/**
 * The office team in one place: recruiting candidates on top, then sign-ups waiting
 * for approval (only when there are any), then the office's agents.
 */
export function AgentsView() {
  const { data: all = [], isLoading, error } = useAllProfiles();
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

/** Lets the admin block an agent, or let a rejected sign-up in after all. Never on themself. */
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
      <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={setStatus.busy} onClick={() => setConfirming(true)}>
        חסימה
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לחסום את {profile.full_name}?</DialogTitle>
            <DialogDescription>החשבון לא יוכל להיכנס למערכת. כל הנתונים נשמרים, ואפשר לאשר את החשבון מחדש בכל רגע.</DialogDescription>
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
              חסימה
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

function useSetStatus() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function run(profile: Profile, status: Enum<"account_status">) {
    setBusy(true);
    const { error } = await createClient().from("profiles").update({ status }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(errorMessage(error));
    qc.invalidateQueries({ queryKey: ["profiles"] });
    toast.success(`${profile.full_name}: ${DONE[status]}`);
  }
  return { run, busy };
}
