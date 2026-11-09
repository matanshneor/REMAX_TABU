"use client";

import { useState } from "react";
import { CreateDialog } from "@/components/crm/create-dialog";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { AgentPhoto, NewAgentPhoto } from "@/components/team/agent-photo";
import { GENDER_OPTIONS } from "@/lib/gender";
import { useDeleteRecord, useSaveRecord } from "@/lib/data";
import type { OfficeAgent } from "@/lib/types";

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
      { name: "gender", label: "מין", type: "select", options: GENDER_OPTIONS, required: true },
      { name: "license", label: "מספר רישיון מתווך", type: "text" },
    ],
  },
];

/** Dialog for adding a person to the office list (admin only). */
export function NewAgentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  return (
    <CreateDialog<OfficeAgent>
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPhoto(null);
      }}
      title="סוכן חדש"
      table="office_agents"
      sections={AGENT_SECTIONS}
      top={<NewAgentPhoto url={photo} onChange={setPhoto} />}
      extra={{ photo_url: photo }}
    />
  );
}

export function AgentEditPanel({ row, onClose }: { row: OfficeAgent | null; onClose: () => void }) {
  const form = useFormValues(AGENT_SECTIONS, row, `${row?.id}:${row?.updated_at}`);
  const save = useSaveRecord("office_agents");
  const remove = useDeleteRecord("office_agents");
  return (
    <Panel
      dirty={form.dirty}
      open={!!row}
      onClose={onClose}
      title={row?.full_name}
      subtitle="פרטי הסוכן — מופיעים גם בכלי המודעות"
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
