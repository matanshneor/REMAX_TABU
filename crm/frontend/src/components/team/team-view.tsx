"use client";

import { MailIcon, PhoneIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Pill } from "@/components/crm/status-badge";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { inactiveReason, type Member, useTeamMembers } from "@/lib/team-members";

/** The office team, read-only for everyone. Adding and removing people is done in ״ניהול סוכנים״ (admin only). */
export function TeamView() {
  const [text, setText] = useState("");
  const { members, error, isLoading: loading } = useTeamMembers();

  const q = text.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = members.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      (digits.length >= 3 && m.phone?.replace(/\D/g, "").includes(digits)),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="צוות המשרד" count={members.length} />

      <div className="relative mb-4 max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="חיפוש לפי שם, טלפון או מייל…" className="h-10 ps-9" />
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<UsersRoundIcon />}
          title={members.length ? "אין סוכנים שמתאימים לחיפוש" : "הרשימה עדיין ריקה"}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </ul>
      )}

    </div>
  );
}

function MemberCard({ member: m }: { member: Member }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
        >
          {initials(m.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{m.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {m.isManager && <Pill tone="purple">מנהל המשרד</Pill>}
            <Pill tone={m.active ? "green" : "gray"}>{m.active ? "פעיל" : m.account ? inactiveReason(m) : "לא רשום למערכת"}</Pill>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {m.phone ? (
          <div className="flex items-center justify-between gap-2">
            <a href={`tel:${m.phone}`} dir="ltr" className="flex items-center gap-1.5 tabular-nums hover:text-foreground">
              <PhoneIcon className="size-3.5" />
              {m.phone}
            </a>
            <WhatsAppButton phone={m.phone} size="icon-sm" label={`וואטסאפ ל${m.name}`} />
          </div>
        ) : (
          <span className="flex items-center gap-1.5">
            <PhoneIcon className="size-3.5" />—
          </span>
        )}
        {m.email && (
          <a
            href={`mailto:${m.email}`}
            className="flex min-w-0 items-center gap-1.5 hover:text-foreground"
          >
            <MailIcon className="size-3.5 shrink-0" />
            <span dir="ltr" className="truncate">
              {m.email}
            </span>
          </a>
        )}
      </div>
    </li>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
