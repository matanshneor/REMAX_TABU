import type { FormSection } from "@/components/form/types";

// No assignee: tasks are private to the user who wrote them.
export const TASK_SECTIONS: FormSection[] = [
  {
    fields: [
      { name: "title", label: "משימה", type: "text", required: true, span: 6 },
      { name: "due_at", label: "מועד", type: "datetime", span: 2 },
      { name: "buyer_id", label: "קונה מקושר", type: "buyer", span: 2 },
      { name: "property_id", label: "נכס מקושר", type: "property", span: 2 },
      { name: "description", label: "פרטים", type: "textarea", span: 6 },
    ],
  },
];
