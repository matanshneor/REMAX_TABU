"use client";

import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { Pill } from "@/components/crm/status-badge";
import Link from "next/link";
import { useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Candidate, Task } from "@/lib/types";
import { AddToCalendar } from "./add-to-calendar";
import { TASK_SECTIONS } from "./task-fields";

/** Tasks are private, so whoever can open one owns it and may edit or delete it. */
export function TaskPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: task, isLoading } = useRecord<Task>("tasks", id);
  const form = useFormValues(TASK_SECTIONS, task, `${task?.id}:${task?.updated_at}`);
  const save = useSaveRecord("tasks");
  const remove = useDeleteRecord("tasks");
  const { data: candidate } = useRecord<Candidate>("candidates", task?.candidate_id ?? null);

  return (
    <Panel
      dirty={form.dirty}
      open={!!id}
      onClose={onClose}
      loading={isLoading || !task}
      title={task?.title}
      subtitle={task && `נוצרה ${formatRelative(task.created_at)}`}
      badges={task && (task.is_done ? <Pill tone="green">בוצעה {formatDateTime(task.done_at)}</Pill> : <Pill tone="blue">פתוחה</Pill>)}
      // Uses the saved due date, so it matches what's in the system.
      headerActions={task && !task.is_done && <AddToCalendar task={task} />}
      footer={
        task && (
          <SaveFooter
            dirty={form.dirty}
            saving={save.isPending}
            onSave={() => save.mutate({ id: task.id, values: form.changes })}
            onReset={form.reset}
            onDelete={() => remove.mutate(task.id, { onSuccess: onClose })}
            deleteLabel="מחק משימה"
          />
        )
      }
    >
      {task && (
        <>
          {candidate && (
            <Link
              href={`/agents?open=${candidate.id}`}
              className="mb-5 flex items-center justify-between rounded-lg border bg-secondary/40 px-3 py-2.5 text-sm hover:border-primary/40"
            >
              <span>
                מועמד: <strong>{candidate.full_name}</strong>
              </span>
              <span className="text-xs text-primary">פתח כרטיס מועמד ←</span>
            </Link>
          )}
          <EntityForm sections={TASK_SECTIONS} values={form.values} onChange={form.set} idPrefix="task" />
        </>
      )}
    </Panel>
  );
}
