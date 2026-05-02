/**
 * Generate an .ICS calendar file (RFC 5545) for an appointment.
 */
interface IcsAppointment {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  durationMinutes: number;
  url?: string;
}

function fmtIcsDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(apt: IcsAppointment): string {
  const start = fmtIcsDate(apt.startISO);
  const end = fmtIcsDate(new Date(new Date(apt.startISO).getTime() + apt.durationMinutes * 60000).toISOString());
  const stamp = fmtIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PsicoOne//Patient Portal//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${apt.id}@psicoone.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(apt.title)}`,
    apt.description ? `DESCRIPTION:${escapeIcs(apt.description)}` : "",
    apt.location ? `LOCATION:${escapeIcs(apt.location)}` : "",
    apt.url ? `URL:${apt.url}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Sessão em 30 minutos",
    "TRIGGER:-PT30M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadIcs(apt: IcsAppointment) {
  const ics = buildIcs(apt);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sessao-${apt.id.slice(0, 8)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
