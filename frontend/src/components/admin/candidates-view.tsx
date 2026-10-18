"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateDialog } from "@/components/crm/create-dialog";
import { ExportButton } from "@/components/crm/export-button";
import { FileAttachment } from "@/components/crm/file-attachment";
import { EmptyState, ErrorState, PageHeader } from "@/components/crm/page-header";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { FilterChip } from "@/components/crm/segmented";
import { StatusBadge } from "@/components/crm/status-badge";
import { EntityForm } from "@/components/form/entity-form";
import type { FormSection } from "@/components/form/types";
import { useFormValues } from "@/components/form/use-form-values";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRecord, useSaveRecord } from "@/lib/data";
import { formatRelative } from "@/lib/format";
import { CANDIDATE_SOURCES, CANDIDATE_STATUS, toOptions } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, Enum } from "@/lib/types";
import { usePanelParam } from "@/lib/use-panel-param";
import { SimpleTable } from "./simple-table";

const CANDIDATE_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "full_name", label: "שם מלא", type: "text", required: true },
      { name: "phone", label: "טלפון", type: "tel" },
      { name: "email", label: "אימייל", type: "email" },
      { name: "source", label: "מקור", type: "select", options: CANDIDATE_SOURCES },
      { name: "status", label: "סטטוס", type: "select", options: toOptions(CANDIDATE_STATUS), required: true },
      { name: "interview_summary", label: "סיכום ראיון", type: "textarea", span: 6 },
    ],
  },
];

export function CandidatesView() {
  const [openId, setOpenId] = usePanelParam();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<Enum<"candidate_status"> | "all">("all");

  const { data: all = [], isLoading, error } = useQuery({
    queryKey: ["candidates", "list"],
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } = await createClient().from("candidates").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const rows = status === "all" ? all : all.filter((c) => c.status === status);

  return (
    <>
      <PageHeader
        title="מועמדים"
        count={all.length}
        description="גיוס סוכנים חדשים למשרד"
        actions={
          <>
            <ExportButton entity="candidates" />
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              מועמד חדש
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip active={status === "all"} onClick={() => setStatus("all")}>
          הכל
        </FilterChip>
        {(Object.keys(CANDIDATE_STATUS) as Enum<"candidate_status">[]).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
            {CANDIDATE_STATUS[s].label}
            <span className="tabular-nums opacity-70">{all.filter((c) => c.status === s).length}</span>
          </FilterChip>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<UserPlusIcon />} title="אין מועמדים" />
      ) : (
        <SimpleTable
          rows={rows}
          selectedId={openId}
          onRowClick={(c) => setOpenId(c.id)}
          columns={[
            { header: "שם", cell: (c) => c.full_name },
            { header: "טלפון", cell: (c) => <span dir="ltr">{c.phone ?? "—"}</span> },
            { header: "סטטוס", cell: (c) => <StatusBadge map={CANDIDATE_STATUS} value={c.status} /> },
            { header: "מקור", cell: (c) => c.source ?? "—" },
            { header: "קו״ח", cell: (c) => (c.cv_path ? "📎" : ""), className: "text-center" },
            { header: "עודכן", cell: (c) => formatRelative(c.updated_at), className: "text-muted-foreground" },
          ]}
        />
      )}

      <CreateDialog<Candidate>
        open={creating}
        onOpenChange={setCreating}
        title="מועמד חדש"
        table="candidates"
        sections={CANDIDATE_SECTIONS}
        initial={{ status: "new" }}
        onCreated={(c) => setOpenId(c.id)}
      />
      <CandidatePanel candidate={all.find((c) => c.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </>
  );
}

function CandidatePanel({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const form = useFormValues(CANDIDATE_SECTIONS, candidate, `${candidate?.id}:${candidate?.updated_at}`);
  const save = useSaveRecord("candidates");
  const remove = useDeleteRecord("candidates");
  return (
    <Panel
      open={!!candidate}
      onClose={onClose}
      title={candidate?.full_name}
      badges={candidate && <StatusBadge map={CANDIDATE_STATUS} value={candidate.status} />}
      footer={
        candidate && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            onSave={() => save.mutate({ id: candidate.id, values: form.changes })}
            onReset={form.reset}
            onDelete={() => remove.mutate(candidate.id, { onSuccess: onClose })}
          />
        )
      }
    >
      {candidate && (
        <>
          <EntityForm sections={CANDIDATE_SECTIONS} values={form.values} onChange={form.set} idPrefix="cand" />
          <FileAttachment
            title="קורות חיים"
            table="candidates"
            rowId={candidate.id}
            column="cv_path"
            path={candidate.cv_path}
            bucket="candidate-cvs"
            accept=".pdf,.doc,.docx,image/*"
          />
        </>
      )}
    </Panel>
  );
}
