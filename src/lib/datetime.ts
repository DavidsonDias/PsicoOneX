/**
 * Datetime helper — forces America/Sao_Paulo timezone for all formatted output.
 * Use these wrappers instead of `date-fns` `format` whenever the value is shown to the user.
 */
import { format as fmt, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TZ = "America/Sao_Paulo";

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string") return parseISO(input);
  return new Date(input);
}

/**
 * Returns a Date object whose UTC components match what wall-clock time
 * the input represents in São Paulo. Useful so date-fns `format` (which
 * uses the local TZ) renders BRT correctly regardless of server/client TZ.
 */
function shiftToSaoPaulo(input: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(input);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const hour = get("hour") === 24 ? 0 : get("hour");
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"))
  );
}

/** Format a date in São Paulo timezone using date-fns tokens. */
export function formatBR(input: Date | string | number, pattern = "dd/MM/yyyy HH:mm"): string {
  try {
    const d = shiftToSaoPaulo(toDate(input));
    return fmt(d, pattern, { locale: ptBR });
  } catch {
    return "";
  }
}

/** Short date "dd/MM/yyyy". */
export const formatDateBR = (input: Date | string | number) => formatBR(input, "dd/MM/yyyy");
/** Time "HH:mm". */
export const formatTimeBR = (input: Date | string | number) => formatBR(input, "HH:mm");
/** Full "dd 'de' MMMM 'de' yyyy". */
export const formatLongBR = (input: Date | string | number) =>
  formatBR(input, "dd 'de' MMMM 'de' yyyy");

/** Current date/time in São Paulo wall-clock. */
export const nowBR = () => shiftToSaoPaulo(new Date());
