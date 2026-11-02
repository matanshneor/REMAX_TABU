"use client";

import { CalendarPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecord } from "@/lib/data";
import { googleCalendarUrl, taskEvent } from "@/lib/calendar";
import { formatAddress, formatFullAddress } from "@/lib/format";
import type { Buyer, Property, Task } from "@/lib/types";

type TaskForCalendar = Pick<Task, "id" | "title" | "due_at" | "description" | "buyer_id" | "property_id">;

/** Copies one task with a due date into the user's phone calendar (or Google Calendar). */
export function AddToCalendar({ task }: { task: TaskForCalendar }) {
  const { data: buyer } = useRecord<Buyer>("buyers", task.buyer_id);
  const { data: property } = useRecord<Property>("properties", task.property_id);
  if (!task.due_at) return null;

  const event = () =>
    taskEvent(
      { ...task, due_at: task.due_at! },
      [buyer && `קונה: ${buyer.full_name}${buyer.phone ? ` (${buyer.phone})` : ""}`, property && `נכס: ${formatAddress(property)}`].filter(
        (s): s is string => !!s,
      ),
      property ? formatFullAddress(property) : undefined,
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarPlusIcon />
        הוסף ליומן
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* A real address (not a generated file), so the iPhone opens its "add event" screen directly. */}
        <DropdownMenuItem render={<a href={`/api/calendar/task/${task.id}.ics`} />}>יומן האייפון / Outlook</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(googleCalendarUrl(event()), "_blank", "noopener")}>Google Calendar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
