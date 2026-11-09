"use client";

import { ClipboardListIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateDialog } from "@/components/crm/create-dialog";
import { EmptyState, ErrorState, SectionHeader } from "@/components/crm/page-header";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { AgentPhoto, NewAgentPhoto } from "@/components/team/agent-photo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRecord, useSaveRecord, useTeam } from "@/lib/data";
import type { OfficeAgent } from "@/lib/types";
import { SimpleTable } from "./simple-table";

/** As printed on the ad (gendered, so chosen rather than guessed). */
const ROLE_OPTIONS = ["סוכן נדל\"ן", "סוכנת נדל\"ן", "זכיין", "זכיינית"].map((r) => ({ value: r, label: r }));

const AGENT_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "full_name", label: "שם מלא", type: "text", required: true, span: 6 },
      { name: "phone", label: "טלפון", type: "tel", placeholder: "050-0000000" },
      { name: "email", label: "אימייל", type: "email" },
    ],
  },
  {
    title: "פרטים למודעות",
    fields: [
      { name: "role", label: "תפקיד במודעה", type: "select", options: ROLE_OPTIONS },
      { name: "license", label: "מספר רישיון מתווך", type: "text" },
    ],
  },
];

/**
 * The list behind "צוות המשרד" and the ad tool. Adding, editing and removing people
 * happens only here (admin only); the team page itself is read-only for everyone.
 */
export function TeamListSection() {
  const list = useTeam();
  const [creating, setCreating] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState<OfficeAgent | null>(null);
  const rows = list.data ?? [];

  return (
    <section className="mb-10">
      <SectionHeader
        icon={<ClipboardListIcon />}
        title="רשימת צוות המשרד"
        count={rows.length}
        description="מה שמופיע בדף ״צוות המשרד״ ובכלי המודעות. הוספה, עריכה והסרה — רק כאן"
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            הוספת סוכן
          </Button>
        }
      />
      {list.error ? (
        <ErrorState error={list.error} />
      ) : list.isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ClipboardListIcon />} title="הרשימה עדיין ריקה" hint="לוחצים על ״הוספת סוכן״ כדי להתחיל." />
      ) : (
        <SimpleTable
          rows={rows}
          onRowClick={(row) => setEditing(row)}
          columns={[
            { header: "שם", cell: (r) => r.full_name },
            { header: "תפקיד במודעה", cell: (r) => r.role || "—" },
            { header: "רישיון", cell: (r) => <span dir="ltr">{r.license || "—"}</span> },
            { header: "טלפון", cell: (r) => <span dir="ltr">{r.phone || "—"}</span> },
            { header: "תמונה", cell: (r) => (r.photo_url ? "יש" : <span className="text-muted-foreground">אין</span>) },
          ]}
        />
      )}

      <CreateDialog<OfficeAgent>
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setNewPhoto(null);
        }}
        title="סוכן חדש ברשימה"
        table="office_agents"
        sections={AGENT_SECTIONS}
        top={<NewAgentPhoto url={newPhoto} onChange={setNewPhoto} />}
        extra={{ photo_url: newPhoto }}
      />
      <EditPanel row={editing} onClose={() => setEditing(null)} />
    </section>
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
            onSave={() => form.validate() && save.mutate({ id: row.id, values: form.changes }, { onSuccess: onClose })}
            onReset={form.reset}
            onDelete={() => remove.mutate(row.id, { onSuccess: onClose })}
            deleteLabel="הסר מהרשימה"
          />
        )
      }
    >
      {row && (
        <>
          <AgentPhoto row={row} />
          <EntityForm sections={AGENT_SECTIONS} values={form.values} onChange={form.set} idPrefix="team" />
          <p className="mt-4 text-sm text-muted-foreground">
            כשהסוכן יירשם לאתר עם אותו טלפון או מייל, המערכת תחבר אותו לשורה הזאת אוטומטית.
            הסרה מהרשימה לא מוחקת את החשבון שלו במערכת, אבל מסירה אותו מכלי המודעות.
          </p>
        </>
      )}
    </Panel>
  );
}
