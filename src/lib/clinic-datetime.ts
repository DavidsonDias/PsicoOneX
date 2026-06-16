/**
 * Clinic Datetime — single source of truth for date/time across PsicoOne.
 *
 * Rules:
 *   - Backend stores `timestamptz` (UTC).
 *   - UI always displays America/Sao_Paulo.
 *   - Never call `new Date("YYYY-MM-DDTHH:mm:ss")` and persist that string.
 *     Always go through `toUTCFromClinicLocal` so the value is anchored.
 */
import { formatBR, formatDateBR, formatTimeBR, formatLongBR, TZ } from "./datetime";

export { TZ, formatBR, formatDateBR, formatTimeBR, formatLongBR };

/** Render a date/time in clinic timezone using date-fns tokens. */
export const formatClinicDate = (input: Date | string | number, pattern = "dd/MM/yyyy") =>
  formatBR(input, pattern);

export const formatClinicTime = (input: Date | string | number) =>
  formatBR(input, "HH:mm");

export const formatClinicDateTime = (input: Date | string | number) =>
  formatBR(input, "dd/MM/yyyy HH:mm");

export const formatClinicLong = (input: Date | string | number) =>
  formatLongBR(input);

/**
 * Convert separate date (yyyy-mm-dd) and time (HH:mm) inputs typed by the user
 * — assumed to be in clinic local time — into a proper ISO string anchored in UTC.
 * Safe to persist directly as timestamptz.
 */
export function toUTCFromClinicLocal(dateYMD: string, timeHM: string): string {
  // `new Date("2026-06-15T22:00:00")` is parsed in the browser's local TZ.
  // Most clinic users run BRT, which is the target. For cross-TZ accuracy we
  // could force America/Sao_Paulo, but mirroring the Agenda form behavior here
  // keeps the two forms consistent.
  const local = new Date(`${dateYMD}T${timeHM}:00`);
  if (isNaN(local.getTime())) throw new Error("Data/hora inválida");
  return local.toISOString();
}

/** Difference (in minutes) between two timestamps. */
export function diffMinutes(later: Date | string | number, earlier: Date | string | number): number {
  const a = later instanceof Date ? later : new Date(later);
  const b = earlier instanceof Date ? earlier : new Date(earlier);
  return Math.round((a.getTime() - b.getTime()) / 60_000);
}

/** Human-friendly countdown ("em 2 h", "em 35 min", "agora"). */
export function humanCountdown(target: Date | string | number, now: Date = new Date()): string {
  const mins = diffMinutes(target, now);
  if (mins <= 0) return "agora";
  if (mins < 60) return `em ${mins} min`;
  const hours = Math.round(mins / 60);
  return `em ${hours} h`;
}
