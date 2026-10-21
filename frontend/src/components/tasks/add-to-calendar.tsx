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
import { downloadIcs, googleCalendarUrl, taskEvent } from "@/lib/calendar";
import { formatAddress } from "@/lib/format";
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
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarPlusIcon />
        הוסף ליומן
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => downloadIcs(event())}>לוח השנה בטלפון (אייפון ועוד)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(googleCalendarUrl(event()), "_blank", "noopener")}>Google Calendar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
