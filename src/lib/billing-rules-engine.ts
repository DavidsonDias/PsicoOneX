/**
 * BillingRulesEngine — motor único de regras de cobrança do PsicoOne.
 *
 * Princípios:
 *  - Frequência de ATENDIMENTO (quando o paciente é atendido) e frequência de
 *    COBRANÇA (quando ele paga) são conceitos separados.
 *  - Cada tipo de cobrança pede APENAS o que faz sentido para ele.
 *      per_session -> valor da sessão + momento do pagamento
 *      weekly      -> dia da semana da cobrança (nunca "dia do mês")
 *      biweekly    -> primeira cobrança + a cada 14 dias (ou 2x por mês)
 *      monthly     -> dia do vencimento (ou último dia útil)
 *      custom      -> intervalo em dias OU dias fixos do mês
 *  - Nada que o sistema consiga calcular com segurança deve ser pedido ao usuário.
 */

export type SessionFrequency =
  | "avulso"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "personalizado";

export type BillingType =
  | "per_session"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export type SessionPaymentTiming = "on_session" | "after_session" | "custom_date";
export type BiweeklyMode = "every_14_days" | "twice_month";
export type MonthlyAmountMode = "auto" | "fixed";

export interface BillingConfig {
  billing_type: BillingType;
  /** Valor de uma sessão (base para projeções). */
  session_value?: number | null;

  /* per_session */
  session_payment_timing?: SessionPaymentTiming;
  custom_due_date?: string | null; // yyyy-MM-dd

  /* weekly */
  /** Deslocamento em dias em relação ao dia da sessão (-1, 0, +1). */
  weekly_offset?: number;
  /** Dia da semana explícito (0=domingo ... 6=sábado). null = mesmo dia da sessão. */
  weekly_weekday?: number | null;

  /* biweekly */
  first_charge_date?: string | null; // yyyy-MM-dd
  biweekly_mode?: BiweeklyMode;
  twice_month_days?: [number, number];

  /* monthly */
  day_of_month?: number | null; // 1..31
  monthly_last_business_day?: boolean;
  monthly_amount_mode?: MonthlyAmountMode;
  monthly_amount?: number | null;

  /* custom */
  custom_interval_days?: number | null;
  custom_days_of_month?: number[];

  /** Fim da regra (opcional). */
  ends_on?: string | null;
}

export const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  per_session: "Por sessão",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
  custom: "Personalizado",
};

export const SESSION_FREQUENCY_LABEL: Record<SessionFrequency, string> = {
  avulso: "Avulso",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  personalizado: "Personalizado",
};

export const WEEKDAY_LABEL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/* ------------------------------------------------------------------ *
 * Helpers de data (sem dependência de timezone do browser)
 * ------------------------------------------------------------------ */

export const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromYMD = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDaysSafe = (d: Date, days: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
};

/** Próxima ocorrência de um dia da semana (0=dom). Hoje conta como próxima. */
export function nextWeekdayDate(weekday: number, from: Date = new Date()): Date {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (weekday - base.getDay() + 7) % 7;
  return addDaysSafe(base, diff);
}

/** Dia do mês respeitando meses curtos (31 em fevereiro -> 28/29). */
export function clampDayOfMonth(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export function lastBusinessDayOfMonth(year: number, month: number): Date {
  let d = new Date(year, month + 1, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDaysSafe(d, -1);
  return d;
}

/* ------------------------------------------------------------------ *
 * Projeções
 * ------------------------------------------------------------------ */

/** Média real de ocorrências por mês (52 semanas / 12 meses = 4,3333). */
export const SESSIONS_PER_MONTH: Record<SessionFrequency, number> = {
  avulso: 0,
  semanal: 52 / 12,
  quinzenal: 26 / 12,
  mensal: 1,
  personalizado: 0,
};

export interface BillingProjection {
  perCharge: number;
  chargesPerMonth: number;
  monthlyAverage: number;
  yearly: number;
  /** Texto curto pronto para a UI. */
  label: string;
}

export function projectBilling(
  config: BillingConfig,
  sessionFrequency: SessionFrequency,
): BillingProjection {
  const sv = Number(config.session_value || 0);
  const sessionsMonth = SESSIONS_PER_MONTH[sessionFrequency] || 0;

  let perCharge = 0;
  let chargesPerMonth = 0;

  switch (config.billing_type) {
    case "per_session":
      perCharge = sv;
      chargesPerMonth = sessionsMonth;
      break;
    case "weekly":
      // Uma cobrança por semana cobre as sessões daquela semana.
      perCharge = sv * Math.max(1, sessionsMonth / (52 / 12));
      chargesPerMonth = 52 / 12;
      break;
    case "biweekly":
      chargesPerMonth = config.biweekly_mode === "twice_month" ? 2 : 26 / 12;
      perCharge = sessionsMonth > 0 ? (sv * sessionsMonth) / chargesPerMonth : sv;
      break;
    case "monthly": {
      chargesPerMonth = 1;
      const auto = sv * sessionsMonth;
      perCharge =
        config.monthly_amount_mode === "fixed" && Number(config.monthly_amount) > 0
          ? Number(config.monthly_amount)
          : auto;
      break;
    }
    case "custom": {
      if (config.custom_days_of_month?.length) {
        chargesPerMonth = config.custom_days_of_month.length;
      } else if (Number(config.custom_interval_days) > 0) {
        chargesPerMonth = 30.44 / Number(config.custom_interval_days);
      }
      perCharge = chargesPerMonth > 0 ? (sv * sessionsMonth) / chargesPerMonth || sv : sv;
      break;
    }
  }

  const monthlyAverage = perCharge * chargesPerMonth;
  const round = (n: number) => Math.round(n * 100) / 100;

  const labels: Record<BillingType, string> = {
    per_session: "por sessão",
    weekly: "por semana",
    biweekly: config.biweekly_mode === "twice_month" ? "2x por mês" : "a cada 14 dias",
    monthly: "por mês",
    custom: config.custom_days_of_month?.length
      ? `nos dias ${config.custom_days_of_month.join(" e ")}`
      : `a cada ${config.custom_interval_days || 0} dias`,
  };

  return {
    perCharge: round(perCharge),
    chargesPerMonth: round(chargesPerMonth),
    monthlyAverage: round(monthlyAverage),
    yearly: round(monthlyAverage * 12),
    label: labels[config.billing_type],
  };
}

/* ------------------------------------------------------------------ *
 * Próximas cobranças
 * ------------------------------------------------------------------ */

export interface NextChargeOptions {
  /** Dia da semana da sessão (0=dom), usado por weekly. */
  sessionWeekday?: number | null;
  /** Data da próxima sessão (usada por per_session). */
  nextSessionDate?: Date | string | null;
  from?: Date;
  count?: number;
}

/** Calcula as próximas datas de cobrança (yyyy-MM-dd). */
export function nextChargeDates(
  config: BillingConfig,
  opts: NextChargeOptions = {},
): string[] {
  const count = Math.max(1, opts.count ?? 3);
  const from = opts.from ? new Date(opts.from) : new Date();
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out: Date[] = [];

  switch (config.billing_type) {
    case "per_session": {
      const base = opts.nextSessionDate
        ? typeof opts.nextSessionDate === "string"
          ? fromYMD(opts.nextSessionDate.slice(0, 10))
          : new Date(opts.nextSessionDate)
        : today;
      if (config.session_payment_timing === "custom_date" && config.custom_due_date) {
        out.push(fromYMD(config.custom_due_date));
      } else if (config.session_payment_timing === "after_session") {
        out.push(addDaysSafe(base, 1));
      } else {
        out.push(base);
      }
      break;
    }
    case "weekly": {
      const wd =
        config.weekly_weekday ??
        (typeof opts.sessionWeekday === "number" ? opts.sessionWeekday : today.getDay());
      let d = addDaysSafe(nextWeekdayDate(wd, today), config.weekly_offset || 0);
      if (d < today) d = addDaysSafe(d, 7);
      for (let i = 0; i < count; i++) out.push(addDaysSafe(d, i * 7));
      break;
    }
    case "biweekly": {
      if (config.biweekly_mode === "twice_month") {
        const [a, b] = config.twice_month_days || [5, 20];
        const days = [a, b].sort((x, y) => x - y);
        let y = today.getFullYear();
        let m = today.getMonth();
        while (out.length < count) {
          for (const day of days) {
            const cand = clampDayOfMonth(y, m, day);
            if (cand >= today && out.length < count) out.push(cand);
          }
          m += 1;
          if (m > 11) { m = 0; y += 1; }
        }
      } else {
        let d = config.first_charge_date ? fromYMD(config.first_charge_date) : today;
        while (d < today) d = addDaysSafe(d, 14);
        for (let i = 0; i < count; i++) out.push(addDaysSafe(d, i * 14));
      }
      break;
    }
    case "monthly": {
      let y = today.getFullYear();
      let m = today.getMonth();
      while (out.length < count) {
        const cand = config.monthly_last_business_day
          ? lastBusinessDayOfMonth(y, m)
          : clampDayOfMonth(y, m, config.day_of_month || 1);
        if (cand >= today) out.push(cand);
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
      break;
    }
    case "custom": {
      if (config.custom_days_of_month?.length) {
        const days = [...config.custom_days_of_month].sort((x, y) => x - y);
        let y = today.getFullYear();
        let m = today.getMonth();
        while (out.length < count) {
          for (const day of days) {
            const cand = clampDayOfMonth(y, m, day);
            if (cand >= today && out.length < count) out.push(cand);
          }
          m += 1;
          if (m > 11) { m = 0; y += 1; }
        }
      } else {
        const step = Math.max(1, Number(config.custom_interval_days) || 30);
        let d = config.first_charge_date ? fromYMD(config.first_charge_date) : today;
        while (d < today) d = addDaysSafe(d, step);
        for (let i = 0; i < count; i++) out.push(addDaysSafe(d, i * step));
      }
      break;
    }
  }

  const limit = config.ends_on ? fromYMD(config.ends_on) : null;
  return out.filter((d) => !limit || d <= limit).map(toYMD);
}

/* ------------------------------------------------------------------ *
 * Consistência (IA local, sem chamada de rede)
 * ------------------------------------------------------------------ */

export interface BillingIssue {
  field?: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggestion?: string;
  suggested_value?: number;
}

export function validateBillingConfig(
  config: BillingConfig,
  sessionFrequency: SessionFrequency,
): BillingIssue[] {
  const issues: BillingIssue[] = [];
  const sv = Number(config.session_value || 0);

  if (!sv || sv <= 0) {
    issues.push({
      field: "session_value",
      severity: "info",
      message: "Valor da sessão não informado — projeções ficarão indisponíveis.",
    });
  }

  if (config.billing_type === "monthly") {
    if (!config.monthly_last_business_day && !config.day_of_month) {
      issues.push({
        field: "day_of_month",
        severity: "error",
        message: "Cobrança mensal exige o dia do vencimento.",
      });
    }
    if (config.monthly_amount_mode === "fixed" && sv > 0) {
      const expected = Math.round(sv * SESSIONS_PER_MONTH[sessionFrequency] * 100) / 100;
      const informed = Number(config.monthly_amount || 0);
      if (expected > 0 && informed > 0 && Math.abs(expected - informed) > Math.max(1, expected * 0.05)) {
        issues.push({
          field: "monthly_amount",
          severity: "warning",
          message: `Atendimento ${SESSION_FREQUENCY_LABEL[sessionFrequency].toLowerCase()} de R$ ${sv.toFixed(2)} projeta R$ ${expected.toFixed(2)}/mês, mas o valor mensal informado é R$ ${informed.toFixed(2)}.`,
          suggestion: "Recalcular",
          suggested_value: expected,
        });
      }
    }
  }

  if (config.billing_type === "biweekly") {
    if (config.biweekly_mode !== "twice_month" && !config.first_charge_date) {
      issues.push({
        field: "first_charge_date",
        severity: "error",
        message: "Informe a data da primeira cobrança quinzenal.",
      });
    }
    if (sessionFrequency === "mensal") {
      issues.push({
        severity: "warning",
        message: "Atendimento mensal com cobrança quinzenal gera duas cobranças por sessão.",
      });
    }
  }

  if (config.billing_type === "weekly" && sessionFrequency === "quinzenal") {
    issues.push({
      severity: "warning",
      message: "Atendimento quinzenal com cobrança semanal cobra semanas sem sessão.",
    });
  }

  if (config.billing_type === "custom") {
    if (!config.custom_days_of_month?.length && !Number(config.custom_interval_days)) {
      issues.push({
        field: "custom_interval_days",
        severity: "error",
        message: "Defina um intervalo em dias ou dias fixos do mês.",
      });
    }
  }

  if (config.billing_type === "per_session" && sessionFrequency === "avulso") {
    issues.push({
      severity: "info",
      message: "Cobrança por sessão em atendimento avulso: cada sessão gera um lançamento.",
    });
  }

  return issues;
}

/** Resumo em texto para o card "Resumo do Plano". */
export function describeBilling(
  config: BillingConfig,
  sessionFrequency: SessionFrequency,
): string {
  const p = projectBilling(config, sessionFrequency);
  switch (config.billing_type) {
    case "per_session":
      return config.session_payment_timing === "after_session"
        ? "Cobrança por sessão, vencendo no dia seguinte à sessão"
        : config.session_payment_timing === "custom_date"
          ? "Cobrança por sessão com vencimento personalizado"
          : "Cobrança por sessão, vencendo no dia da sessão";
    case "weekly": {
      const wd =
        typeof config.weekly_weekday === "number" ? WEEKDAY_LABEL[config.weekly_weekday] : "mesmo dia da sessão";
      return `Cobrança semanal (${wd}) · média mensal R$ ${p.monthlyAverage.toFixed(2)}`;
    }
    case "biweekly":
      return config.biweekly_mode === "twice_month"
        ? `Duas cobranças por mês (dias ${(config.twice_month_days || [5, 20]).join(" e ")})`
        : "Cobrança a cada 14 dias";
    case "monthly":
      return config.monthly_last_business_day
        ? "Cobrança mensal no último dia útil"
        : `Cobrança mensal no dia ${config.day_of_month || 1}`;
    case "custom":
      return `Cobrança personalizada ${p.label}`;
  }
}

/** Chave de competência usada para evitar duplicidade de lançamentos. */
export function competenceKey(dueDateYMD: string, billingType: BillingType): string {
  const d = fromYMD(dueDateYMD);
  if (billingType === "monthly") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return dueDateYMD;
}
