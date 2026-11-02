"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CurrencyInput } from "./currency-input";
import { RelationSelect } from "./relation-select";
import { TagsInput } from "./tags-input";
import type { FieldDef, FormSection, FormValues } from "./types";

// On phones a third of the row is too narrow, so small fields widen there.
const SPAN: Record<number, string> = {
  1: "col-span-3 sm:col-span-1",
  2: "col-span-3 sm:col-span-2",
  3: "col-span-6 sm:col-span-3",
  4: "col-span-6 sm:col-span-4",
  6: "col-span-6",
};

export function EntityForm({
  sections,
  values,
  onChange,
  readOnly,
  lockedFields = [],
  idPrefix = "f",
}: {
  sections: FormSection[];
  values: FormValues;
  onChange: (name: string, value: unknown) => void;
  readOnly?: boolean;
  lockedFields?: string[];
  idPrefix?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section, i) => (
        <fieldset key={section.title ?? i} className="flex flex-col gap-3">
          {section.title && (
            <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">{section.title}</legend>
          )}
          <div className="grid grid-cols-6 gap-x-3 gap-y-3">
            {section.fields
              .filter((field) => !field.hidden)
              .map((field) => (
                <div key={field.name} className={cn(SPAN[field.span ?? 3], field.type === "boolean" && "self-end")}>
                  <Field
                    field={field}
                    id={`${idPrefix}-${field.name}`}
                    value={values[field.name]}
                    onChange={(v) => onChange(field.name, v)}
                    disabled={readOnly || lockedFields.includes(field.name)}
                    now={
                      field.now && {
                        on: Boolean(values[field.now.field]),
                        // "Now" and a date exclude each other: turning it on clears the date.
                        toggle: () => {
                          const on = !values[field.now!.field];
                          onChange(field.now!.field, on);
                          if (on) onChange(field.name, "");
                        },
                      }
                    }
                  />
                </div>
              ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function Field({
  field,
  id,
  value,
  onChange,
  disabled,
  now,
}: {
  field: FieldDef;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  /** The field's `now` button: whether it's on, and switching it. */
  now?: { on: boolean; toggle: () => void };
}) {
  if (field.type === "boolean") {
    return (
      <label
        htmlFor={id}
        className={cn(
          "flex h-8 items-center justify-between gap-2 rounded-lg border border-input px-2.5 text-sm",
          disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/60",
        )}
      >
        {field.label}
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(c) => onChange(c)} disabled={disabled} />
      </label>
    );
  }

  const str = (value as string) ?? "";
  const label = (
    <Label htmlFor={id} className="mb-1.5 text-xs text-muted-foreground">
      {field.label}
      {field.required && <span className="text-brand-red">*</span>}
    </Label>
  );

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <Textarea id={id} value={str} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} placeholder={field.placeholder} />
      );
      break;
    case "select":
      control = field.other ? (
        <SelectWithOther id={id} field={field} value={str} onChange={onChange} disabled={disabled} />
      ) : (
        <NativeSelect id={id} value={str} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          {!field.required && !field.noEmpty && <option value="">—</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      );
      break;
    case "multi": {
      const selected = (value as string[]) ?? [];
      control = (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
          {field.options?.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                className={cn(
                  "h-8 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "tags":
      control = (
        <TagsInput value={(value as string[]) ?? []} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />
      );
      break;
    case "agent":
    case "team":
    case "buyer":
    case "property":
      control = <RelationSelect id={id} kind={field.type} value={str} onChange={onChange} disabled={disabled} />;
      break;
    case "currency":
      control = <CurrencyInput id={id} value={str} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
      break;
    case "date":
      if (now && field.now) {
        control = (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={now.toggle}
              disabled={disabled}
              aria-pressed={now.on}
              className={cn(
                "h-8 shrink-0 rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:opacity-60",
                now.on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {field.now.label}
            </button>
            <Input
              id={id}
              type="date"
              value={now.on ? "" : str}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || now.on}
              className="min-w-0"
            />
          </div>
        );
        break;
      }
      control = <Input id={id} type="date" value={str} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
      break;
    default: {
      const inputType = field.type === "datetime" ? "datetime-local" : field.type;
      const listId = field.suggestions ? `${id}-list` : undefined;
      control = (
        <div className="relative">
          <Input
            id={id}
            type={inputType}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            step={field.step}
            min={field.type === "number" ? (field.min ?? 0) : undefined}
            list={listId}
            dir={["tel", "email", "url"].includes(field.type) ? "ltr" : undefined}
            className={cn(["tel", "email", "url"].includes(field.type) && "text-end")}
          />
          {field.suggestions && (
            <datalist id={listId}>
              {field.suggestions.map((o) => (
                <option key={o.value} value={o.value} />
              ))}
            </datalist>
          )}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col">
      {label}
      {control}
    </div>
  );
}

/**
 * A list plus an "other" choice: picking it opens a text box, and what's typed there is the value.
 * A saved value that isn't in the list (typed earlier) shows as "other" with its text.
 */
function SelectWithOther({
  id,
  field,
  value,
  onChange,
  disabled,
}: {
  id: string;
  field: FieldDef;
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const listed = !value || !!field.options?.some((o) => o.value === value);
  // Just picked "other" and nothing typed yet; a typed value that's in the list shows as that choice.
  const [typing, setTyping] = useState(false);
  const other = !listed || (typing && !value);
  const OTHER = "__other__";

  return (
    <div className="flex flex-col gap-1.5">
      <NativeSelect
        id={id}
        value={other ? OTHER : value}
        onChange={(e) => {
          const picked = e.target.value === OTHER;
          setTyping(picked);
          onChange(picked ? "" : e.target.value);
        }}
        disabled={disabled}
      >
        {!field.required && !field.noEmpty && <option value="">—</option>}
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={OTHER}>{field.other}</option>
      </NativeSelect>
      {other && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder ?? "כתבו כאן"}
          aria-label={`${field.label}: ${field.other}`}
          autoFocus={typing && !value}
        />
      )}
    </div>
  );
}
