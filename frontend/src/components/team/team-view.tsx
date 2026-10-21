"use client";

import { useQuery } from "@tanstack/react-query";
import { MailIcon, PhoneIcon, PlusIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CreateDialog } from "@/components/crm/create-dialog";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { Pill } from "@/components/crm/status-badge";
import { WhatsAppButton } from "@/components/crm/whatsapp-button";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllProfiles, useDeleteRecord, useSaveRecord } from "@/lib/data";
import type { Tone } from "@/lib/labels";
import { isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { OfficeAgent, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const AGENT_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "full_name", label: "שם מלא", type: "text", required: true, span: 6 },
      { name: "phone", label: "טלפון", type: "tel", placeholder: "050-0000000" },
      { name: "email", label: "אימייל", type: "email" },
    ],
  },
];

/** One person on the team: a row from the office list, an account, or both once linked. */
type Member = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  isManager: boolean;
  account: Profile | null;
  listRow: OfficeAgent | null;
};

const ACCOUNT_LABEL: Record<"none" | Profile["status"], { label: string; tone: Tone }> = {
  active: { label: "משתמש במערכת", tone: "green" },
  pending: { label: "ממתין לאישור", tone: "orange" },
  rejected: { label: "חסום", tone: "gray" },
  none: { label: "עוד לא נרשם", tone: "neutral" },
};

/** The office team: the admin's list of agents, merged with everyone who has an account. */
export function TeamView() {
  const { profile } = useAuth();
  const admin = isAdmin(profile);
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OfficeAgent | null>(null);

  const list = useQuery({
    queryKey: ["office_agents"],
    queryFn: async (): Promise<OfficeAgent[]> => {
      const { data, error } = await createClient().from("office_agents").select("*");
      if (error) throw error;
      return data;
    },
  });
  const accounts = useAllProfiles();

  const members = useMemo(() => {
    const byId = new Map((accounts.data ?? []).map((p) => [p.id, p]));
    const linked = new Set<string>();
    const out: Member[] = (list.data ?? []).map((row) => {
      const account = row.profile_id ? (byId.get(row.profile_id) ?? null) : null;
      if (account) linked.add(account.id);
      return {
        key: row.id,
        name: row.full_name,
        phone: row.phone ?? account?.phone ?? null,
        email: row.email ?? account?.email ?? null,
        isManager: account?.role === "admin",
        account,
        listRow: row,
      };
    });
    // Approved accounts that aren't on the list yet still belong on the team.
    for (const p of accounts.data ?? []) {
      if (linked.has(p.id) || p.status !== "active") continue;
      out.push({ key: p.id, name: p.full_name, phone: p.phone, email: p.email, isManager: p.role === "admin", account: p, listRow: null });
    }
    return out.sort((a, b) => Number(b.isManager) - Number(a.isManager) || a.name.localeCompare(b.name, "he"));
  }, [list.data, accounts.data]);

  const q = text.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = members.filter(
    (m) =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      (digits.length >= 3 && m.phone?.replace(/\D/g, "").includes(digits)),
  );

  const error = list.error ?? accounts.error;
  const loading = list.isLoading || accounts.isLoading;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="צוות המשרד"
        count={members.length}
        description="כל סוכני המשרד ופרטי הקשר שלהם"
        actions={
          admin && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              הוסף סוכן
            </Button>
          )
        }
      />

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
          hint={admin && !members.length ? "לחץ על ״הוסף סוכן״ כדי להתחיל." : undefined}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <MemberCard key={m.key} member={m} onEdit={admin && m.listRow ? () => setEditing(m.listRow) : undefined} />
          ))}
        </ul>
      )}

      {admin && (
        <>
          <CreateDialog<OfficeAgent>
            open={creating}
            onOpenChange={setCreating}
            title="סוכן חדש ברשימה"
            table="office_agents"
            sections={AGENT_SECTIONS}
          />
          <EditPanel row={editing} onClose={() => setEditing(null)} />
        </>
      )}
    </div>
  );
}

function MemberCard({ member: m, onEdit }: { member: Member; onEdit?: () => void }) {
  const status = ACCOUNT_LABEL[m.account?.status ?? "none"];
  return (
    <li
      onClick={onEdit}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4",
        onEdit && "cursor-pointer transition-colors hover:border-primary/40",
      )}
    >
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
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {m.phone ? (
          <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
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
            onClick={(e) => e.stopPropagation()}
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

function EditPanel({ row, onClose }: { row: OfficeAgent | null; onClose: () => void }) {
  const form = useFormValues(AGENT_SECTIONS, row, `${row?.id}:${row?.updated_at}`);
  const save = useSaveRecord("office_agents");
  const remove = useDeleteRecord("office_agents");
  return (
    <Panel
      dirty={form.dirty}
      open={!!row}
      onClose={onClose}
      title={row?.full_name}
      subtitle="פרטים ברשימת צוות המשרד"
      footer={
        row && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            onSave={() => save.mutate({ id: row.id, values: form.changes }, { onSuccess: onClose })}
            onReset={form.reset}
            onDelete={() => remove.mutate(row.id, { onSuccess: onClose })}
            deleteLabel="הסר מהרשימה"
          />
        )
      }
    >
      {row && (
        <>
          <EntityForm sections={AGENT_SECTIONS} values={form.values} onChange={form.set} idPrefix="team" />
          <p className="mt-4 text-sm text-muted-foreground">
            כשהסוכן יירשם לאתר עם אותו טלפון או מייל, המערכת תחבר אותו לשורה הזאת אוטומטית.
            הסרה מהרשימה לא מוחקת את החשבון שלו במערכת.
          </p>
        </>
      )}
    </Panel>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
