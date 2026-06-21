// Generates "Add to Calendar" URLs for Google, Outlook and an ICS download.
// All datetime arithmetic is done in UTC to avoid timezone drift.

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startISO: string; // any ISO8601 with timezone
  durationMinutes: number;
}

function toCompactUTC(iso: string): string {
  // 20260619T120000Z
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const start = toCompactUTC(ev.startISO);
  const end = toCompactUTC(addMinutesIso(ev.startISO, ev.durationMinutes));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${end}`,
    details: ev.description || "",
    location: ev.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    body: ev.description || "",
    location: ev.location || "",
    startdt: ev.startISO,
    enddt: addMinutesIso(ev.startISO, ev.durationMinutes),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function icsDataUri(ev: CalendarEvent): string {
  const dtStart = toCompactUTC(ev.startISO);
  const dtEnd = toCompactUTC(addMinutesIso(ev.startISO, ev.durationMinutes));
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@psicoone`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PsicoOne//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${(ev.description || "").replace(/\n/g, "\\n")}`,
    `LOCATION:${ev.location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function calendarButtonsHtml(ev: CalendarEvent): string {
  const g = googleCalendarUrl(ev);
  const o = outlookCalendarUrl(ev);
  const ics = icsDataUri(ev);
  return `
    <div style="text-align:center;margin:20px 0;">
      <p style="font-size:13px;color:#666;margin:0 0 10px;">Adicionar ao seu calendário</p>
      <a href="${g}" style="display:inline-block;margin:4px;padding:10px 16px;background:#fff;border:1px solid #ddd;border-radius:8px;color:#333;text-decoration:none;font-size:13px;font-weight:500;">📅 Google</a>
      <a href="${o}" style="display:inline-block;margin:4px;padding:10px 16px;background:#fff;border:1px solid #ddd;border-radius:8px;color:#333;text-decoration:none;font-size:13px;font-weight:500;">📅 Outlook</a>
      <a href="${ics}" style="display:inline-block;margin:4px;padding:10px 16px;background:#fff;border:1px solid #ddd;border-radius:8px;color:#333;text-decoration:none;font-size:13px;font-weight:500;">📅 Apple / iCal</a>
    </div>
  `;
}
