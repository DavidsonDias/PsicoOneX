/**
 * SchedulingRulesEngine — motor único de recorrência da Agenda.
 * Sempre trabalha com datas locais da clínica (America/Sao_Paulo na UI).
 */
import {
  addDaysSafe,
  clampDayOfMonth,
  fromYMD,
  nextWeekdayDate,
  toYMD,
  WEEKDAY_LABEL,
  type SessionFrequency,
} from "./billing-rules-engine";

export type { SessionFrequency };
export { WEEKDAY_LABEL };

export type TerminationMode = "count" | "until" | "open_ended";

export interface RecurrenceConfig {
  frequency: SessionFrequency;
  /** yyyy-MM-dd da primeira sessão. */
  startDate: string;
  /** HH:mm da sessão. */
  time?: string;
  durationMinutes?: number;
  termination: TerminationMode;
  /** termination = count */
  occurrences?: number;
  /** termination = until */
  untilDate?: string | null;
  /** frequency = personalizado */
  customIntervalDays?: number | null;
  /** Janela rolante para recorrência sem prazo (dias). */
  rollingWindowDays?: number;
}

export const INTERVAL_DAYS: Partial<Record<SessionFrequency, number>> = {
  semanal: 7,
  quinzenal: 14,
};

/** Data inicial inteligente: escolher "segunda" numa quarta => próxima segunda. */
export function smartStartDate(weekday: number, from: Date = new Date()): string {
  return toYMD(nextWeekdayDate(weekday, from));
}

export const MAX_GENERATED = 200;

/** Gera as datas (yyyy-MM-dd) das ocorrências da recorrência. */
export function generateOccurrences(config: RecurrenceConfig): string[] {
  const start = fromYMD(config.startDate);
  if (isNaN(start.getTime())) return [];
  if (config.frequency === "avulso") return [toYMD(start)];

  const rolling = config.rollingWindowDays ?? 90;
  const hardLimit =
    config.termination === "until" && config.untilDate
      ? fromYMD(config.untilDate)
      : config.termination === "open_ended"
        ? addDaysSafe(new Date(), rolling)
        : null;

  const maxCount =
    config.termination === "count"
      ? Math.min(Math.max(1, config.occurrences || 1), MAX_GENERATED)
      : MAX_GENERATED;

  const out: string[] = [];

  if (config.frequency === "mensal") {
    const day = start.getDate();
    let y = start.getFullYear();
    let m = start.getMonth();
    while (out.length < maxCount) {
      const d = clampDayOfMonth(y, m, day);
      if (hardLimit && d > hardLimit) break;
      if (d >= start) out.push(toYMD(d));
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return out;
  }

  const step =
    config.frequency === "personalizado"
      ? Math.max(1, Number(config.customIntervalDays) || 21)
      : INTERVAL_DAYS[config.frequency] || 7;

  let d = start;
  while (out.length < maxCount) {
    if (hardLimit && d > hardLimit) break;
    out.push(toYMD(d));
    d = addDaysSafe(d, step);
  }
  return out;
}

export interface OccurrenceConflict {
  date: string;
  reason: string;
}

/** Detecta conflitos com horários já ocupados (ISO strings de agendamentos). */
export function detectConflicts(
  dates: string[],
  time: string,
  busyISO: string[],
): OccurrenceConflict[] {
  const busy = new Set(
    busyISO.map((iso) => {
      const d = new Date(iso);
      return `${toYMD(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }),
  );
  return dates
    .filter((d) => busy.has(`${d} ${time}`))
    .map((d) => ({ date: d, reason: "Já existe um agendamento neste horário" }));
}

export function describeRecurrence(config: RecurrenceConfig): string {
  if (config.frequency === "avulso") return "Sessão única";
  const freq =
    config.frequency === "semanal"
      ? "Semanal"
      : config.frequency === "quinzenal"
        ? "Quinzenal"
        : config.frequency === "mensal"
          ? "Mensal"
          : `A cada ${config.customIntervalDays || 21} dias`;
  const end =
    config.termination === "count"
      ? `${config.occurrences || 1} sessões`
      : config.termination === "until"
        ? `até ${config.untilDate ? config.untilDate.split("-").reverse().join("/") : "-"}`
        : `sem prazo (janela de ${config.rollingWindowDays ?? 90} dias)`;
  const wd = WEEKDAY_LABEL[fromYMD(config.startDate).getDay()];
  return `${freq} · ${wd} · ${end}`;
}
