// "Add to calendar" for a single task: an .ics file (iPhone, Outlook, most phone calendars)
// or a Google Calendar link. It's a one-time copy: later changes in the CRM don't follow it.

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  /** Minutes. */
  duration: number;
  details: string;
  url: string;
};

const EVENT_MINUTES = 30;
const ALARM_MINUTES = 15;

export function taskEvent(task: { id: string; title: string; due_at: string; description: string | null }, related: string[]) {
  const url = `${window.location.origin}/tasks?open=${task.id}`;
  const details = [task.description, ...related, `פתיחה במערכת: ${url}`].filter(Boolean).join("\n");
  return { id: task.id, title: task.title, start: new Date(task.due_at), duration: EVENT_MINUTES, details, url } satisfies CalendarEvent;
}

/** 2026-10-21T13:00:00Z → 20261021T130000Z */
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** iCalendar lines are folded at 75 bytes; Hebrew letters are 2 bytes, so count bytes, not characters. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function icsFile(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.duration * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RE/MAX Tabu//CRM//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:task-${e.id}@remax-tabu`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.details)}`,
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(e.title)}`,
    `TRIGGER:-PT${ALARM_MINUTES}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Opens the phone's "add to calendar" screen (iPhone) or downloads the file to open. */
export function downloadIcs(e: CalendarEvent) {
  const blob = new Blob([icsFile(e)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "task.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.duration * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utc(e.start)}/${utc(end)}`,
    details: e.details,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
