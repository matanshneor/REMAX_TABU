"use client";

import { EntityForm } from "@/components/form/entity-form";
import { useFormValues } from "@/components/form/use-form-values";
import { Panel, SaveFooter } from "@/components/crm/panel";
import { Pill } from "@/components/crm/status-badge";
import { useDeleteRecord, useRecord, useSaveRecord } from "@/lib/data";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Task } from "@/lib/types";
import { TASK_SECTIONS } from "./task-fields";

/** Tasks are private, so whoever can open one owns it and may edit or delete it. */
export function TaskPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: task, isLoading } = useRecord<Task>("tasks", id);
  const form = useFormValues(TASK_SECTIONS, task, `${task?.id}:${task?.updated_at}`);
  const save = useSaveRecord("tasks");
  const remove = useDeleteRecord("tasks");

  return (
    <Panel
      open={!!id}
      onClose={onClose}
      loading={isLoading || !task}
      title={task?.title}
      subtitle={task && `נוצרה ${formatRelative(task.created_at)}`}
      badges={task && (task.is_done ? <Pill tone="green">בוצעה {formatDateTime(task.done_at)}</Pill> : <Pill tone="blue">פתוחה</Pill>)}
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
      {task && <EntityForm sections={TASK_SECTIONS} values={form.values} onChange={form.set} idPrefix="task" />}
    </Panel>
  );
}
