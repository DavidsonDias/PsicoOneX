import { describe, expect, it } from "vitest";
import {
  nextChargeDates,
  projectBilling,
  validateBillingConfig,
  type BillingConfig,
} from "./billing-rules-engine";
import { generateOccurrences } from "./scheduling-rules-engine";

const base = (over: Partial<BillingConfig>): BillingConfig => ({
  billing_type: "per_session",
  session_value: 100,
  ...over,
});

describe("BillingRulesEngine", () => {
  it("A — semanal + por sessão: uma cobrança por sessão", () => {
    const p = projectBilling(base({ billing_type: "per_session" }), "semanal");
    expect(p.perCharge).toBe(100);
    expect(p.monthlyAverage).toBeCloseTo(433.33, 1);
  });

  it("B — semanal + semanal: média mensal 4,33x, sem dia do mês", () => {
    const cfg = base({ billing_type: "weekly", weekly_offset: 0 });
    const p = projectBilling(cfg, "semanal");
    expect(p.monthlyAverage).toBeCloseTo(433.33, 1);
    const dates = nextChargeDates(cfg, { sessionWeekday: 1, count: 3 });
    expect(dates).toHaveLength(3);
    // intervalo de 7 dias
    const d0 = new Date(dates[0]), d1 = new Date(dates[1]);
    expect((d1.getTime() - d0.getTime()) / 86400000).toBe(7);
  });

  it("C — semanal + mensal: exige dia e detecta valor inconsistente", () => {
    const cfg = base({ billing_type: "monthly", monthly_amount_mode: "fixed", monthly_amount: 100 });
    const issues = validateBillingConfig(cfg, "semanal");
    expect(issues.some((i) => i.field === "day_of_month" && i.severity === "error")).toBe(true);
    const warn = issues.find((i) => i.field === "monthly_amount");
    expect(warn?.suggested_value).toBeCloseTo(433.33, 1);
  });

  it("D/E — quinzenal a cada 14 dias calcula a próxima automaticamente", () => {
    const cfg = base({ billing_type: "biweekly", first_charge_date: "2099-08-10" });
    const dates = nextChargeDates(cfg, { count: 3 });
    expect(dates).toEqual(["2099-08-10", "2099-08-24", "2099-09-07"]);
  });

  it("E2 — duas cobranças por mês é diferente de 14 dias", () => {
    const twice = projectBilling(
      base({ billing_type: "biweekly", biweekly_mode: "twice_month" }),
      "quinzenal",
    );
    const every14 = projectBilling(
      base({ billing_type: "biweekly", biweekly_mode: "every_14_days" }),
      "quinzenal",
    );
    expect(twice.chargesPerMonth).toBe(2);
    expect(every14.chargesPerMonth).toBeCloseTo(2.17, 1);
  });

  it("F — mensal com dia 10 gera vencimento no dia 10", () => {
    const cfg = base({ billing_type: "monthly", day_of_month: 10 });
    const [d] = nextChargeDates(cfg, { count: 1 });
    expect(d.endsWith("-10")).toBe(true);
  });

  it("G — recorrência sem prazo usa janela rolante e não cria milhares", () => {
    const occ = generateOccurrences({
      frequency: "semanal",
      startDate: new Date().toISOString().slice(0, 10),
      termination: "open_ended",
      rollingWindowDays: 90,
    });
    expect(occ.length).toBeLessThanOrEqual(14);
    expect(occ.length).toBeGreaterThan(10);
  });

  it("H — alteração de plano recalcula projeção", () => {
    const before = projectBilling(base({ billing_type: "per_session" }), "quinzenal");
    const after = projectBilling(
      base({ billing_type: "monthly", monthly_amount_mode: "auto" }),
      "quinzenal",
    );
    expect(after.monthlyAverage).toBeCloseTo(before.monthlyAverage, 1);
  });
});
