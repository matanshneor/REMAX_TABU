// Calendar events for tasks: .ics (one task for the iPhone / Outlook "add event" screen, or a
// subscription feed of all of a user's tasks) and Google Calendar links. It's a one-time copy: later changes in the CRM don't follow it.

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  /** Minutes. */
  duration: number;
  details: string;
  url: string;
  /** Where (e.g. the property's address): calendars show a map and can navigate there. */
  location?: string;
};

const EVENT_MINUTES = 30;
const ALARM_MINUTES = 15;

export function taskEvent(
  task: { id: string; title: string; due_at: string; description: string | null },
  related: string[],
  location?: string,
) {
  const url = `${window.location.origin}/tasks?open=${task.id}`;
  const details = [task.description, ...related, `פתיחה במערכת: ${url}`].filter(Boolean).join("\n");
  return { id: task.id, title: task.title, start: new Date(task.due_at), duration: EVENT_MINUTES, details, url, location } satisfies CalendarEvent;
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

function eventLines(e: CalendarEvent, stamp: Date, sequence = 0): string[] {
  const end = new Date(e.start.getTime() + e.duration * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:task-${e.id}@remax-tabu`,
    `DTSTAMP:${utc(stamp)}`,
    `SEQUENCE:${sequence}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.details)}`,
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(e.title)}`,
    `TRIGGER:-PT${ALARM_MINUTES}M`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/**
 * A whole calendar. With `name` it's a subscription feed: phones show it as its own calendar
 * and are asked to re-fetch it hourly. `version` (e.g. the task's last update time) lets them
 * notice an edited event.
 */
export function icsCalendar(events: (CalendarEvent & { version?: number })[], name?: string): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RE/MAX Tabu//CRM//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(name
      ? [`X-WR-CALNAME:${escapeText(name)}`, "X-WR-TIMEZONE:Asia/Jerusalem", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"]
      : []),
    ...events.flatMap((e) => eventLines(e, now, e.version ?? 0)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.duration * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utc(e.start)}/${utc(end)}`,
    details: e.details,
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
