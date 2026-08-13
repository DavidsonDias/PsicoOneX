import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CalendarClock, Info, Wand2 } from "lucide-react";
import {
  BILLING_TYPE_LABEL,
  WEEKDAY_LABEL,
  describeBilling,
  nextChargeDates,
  projectBilling,
  validateBillingConfig,
  type BillingConfig,
  type BillingType,
  type SessionFrequency,
} from "@/lib/billing-rules-engine";

const TYPES: BillingType[] = ["per_session", "weekly", "biweekly", "monthly", "custom"];

interface Props {
  value: BillingConfig;
  onChange: (next: BillingConfig) => void;
  /** Frequência de atendimento (conceito separado da cobrança). */
  sessionFrequency: SessionFrequency;
  /** Dia da semana da sessão (0=dom), quando conhecido. */
  sessionWeekday?: number | null;
  /** Esconde o campo de valor da sessão quando ele já é pedido fora. */
  hideSessionValue?: boolean;
  className?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (ymd: string) => ymd.split("-").reverse().join("/");

export function BillingConfiguration({
  value,
  onChange,
  sessionFrequency,
  sessionWeekday,
  hideSessionValue,
  className,
}: Props) {
  const set = (patch: Partial<BillingConfig>) => onChange({ ...value, ...patch });

  const projection = useMemo(
    () => projectBilling(value, sessionFrequency),
    [value, sessionFrequency],
  );
  const issues = useMemo(
    () => validateBillingConfig(value, sessionFrequency),
    [value, sessionFrequency],
  );
  const upcoming = useMemo(
    () => nextChargeDates(value, { sessionWeekday, count: 3 }),
    [value, sessionWeekday],
  );

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Tipo de cobrança */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" /> Tipo de Cobrança
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TYPES.map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              aria-pressed={value.billing_type === t}
              variant={value.billing_type === t ? "default" : "outline"}
              className="min-h-11 text-xs sm:text-sm"
              onClick={() => set({ billing_type: t })}
            >
              {BILLING_TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Atendimento e cobrança são independentes: o paciente pode ser atendido semanalmente e pagar mensalmente.
        </p>
      </div>

      {!hideSessionValue && (
        <div className="space-y-2">
          <Label htmlFor="billing_session_value">Valor da sessão (R$)</Label>
          <Input
            id="billing_session_value"
            type="number"
            step="0.01"
            inputMode="decimal"
            className="min-h-11"
            value={value.session_value ?? ""}
            onChange={(e) =>
              set({ session_value: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="200.00"
          />
        </div>
      )}

      {/* ---------- POR SESSÃO ---------- */}
      {value.billing_type === "per_session" && (
        <div className="space-y-2">
          <Label>Quando considerar o pagamento?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { v: "on_session", l: "No dia da sessão" },
              { v: "after_session", l: "Após a sessão" },
              { v: "custom_date", l: "Data personalizada" },
            ].map((o) => (
              <Button
                key={o.v}
                type="button"
                size="sm"
                variant={(value.session_payment_timing || "on_session") === o.v ? "default" : "outline"}
                className="min-h-11 text-xs sm:text-sm"
                onClick={() => set({ session_payment_timing: o.v as any })}
              >
                {o.l}
              </Button>
            ))}
          </div>
          {value.session_payment_timing === "custom_date" && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="billing_custom_due">Data de vencimento</Label>
              <Input
                id="billing_custom_due"
                type="date"
                className="min-h-11"
                value={value.custom_due_date || ""}
                onChange={(e) => set({ custom_due_date: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {/* ---------- SEMANAL (sem dia do mês!) ---------- */}
      {value.billing_type === "weekly" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Dia de cobrança semanal</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { off: 0, wd: null, l: "Mesmo dia da sessão" },
                { off: -1, wd: null, l: "1 dia antes" },
                { off: 1, wd: null, l: "1 dia depois" },
              ].map((o) => (
                <Button
                  key={o.l}
                  type="button"
                  size="sm"
                  variant={
                    value.weekly_weekday == null && (value.weekly_offset || 0) === o.off
                      ? "default"
                      : "outline"
                  }
                  className="min-h-11 text-xs"
                  onClick={() => set({ weekly_offset: o.off, weekly_weekday: null })}
                >
                  {o.l}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={value.weekly_weekday != null ? "default" : "outline"}
                className="min-h-11 text-xs"
                onClick={() =>
                  set({ weekly_weekday: sessionWeekday ?? new Date().getDay(), weekly_offset: 0 })
                }
              >
                Outro dia da semana
              </Button>
            </div>
          </div>
          {value.weekly_weekday != null && (
            <div className="space-y-2">
              <Label htmlFor="weekly_weekday">Cobrar toda</Label>
              <Select
                value={String(value.weekly_weekday)}
                onValueChange={(v) => set({ weekly_weekday: Number(v) })}
              >
                <SelectTrigger id="weekly_weekday" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABEL.map((l, i) => (
                    <SelectItem key={i} value={String(i)}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ---------- QUINZENAL ---------- */}
      {value.billing_type === "biweekly" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Regra quinzenal</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { v: "every_14_days", l: "A cada 14 dias" },
                { v: "twice_month", l: "Duas cobranças por mês" },
              ].map((o) => (
                <Button
                  key={o.v}
                  type="button"
                  size="sm"
                  variant={(value.biweekly_mode || "every_14_days") === o.v ? "default" : "outline"}
                  className="min-h-11 text-xs sm:text-sm"
                  onClick={() => set({ biweekly_mode: o.v as any })}
                >
                  {o.l}
                </Button>
              ))}
            </div>
          </div>

          {(value.biweekly_mode || "every_14_days") === "every_14_days" ? (
            <div className="space-y-2">
              <Label htmlFor="first_charge_date">Primeira cobrança</Label>
              <Input
                id="first_charge_date"
                type="date"
                className="min-h-11"
                value={value.first_charge_date || ""}
                onChange={(e) => set({ first_charge_date: e.target.value })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((idx) => (
                <div key={idx} className="space-y-2">
                  <Label htmlFor={`twice_${idx}`}>{idx === 0 ? "1ª cobrança (dia)" : "2ª cobrança (dia)"}</Label>
                  <Input
                    id={`twice_${idx}`}
                    type="number"
                    min={1}
                    max={31}
                    className="min-h-11"
                    value={(value.twice_month_days || [5, 20])[idx]}
                    onChange={(e) => {
                      const pair = [...(value.twice_month_days || [5, 20])] as [number, number];
                      pair[idx] = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                      set({ twice_month_days: pair });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- MENSAL ---------- */}
      {value.billing_type === "monthly" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label className="text-sm">Último dia útil</Label>
              <p className="text-xs text-muted-foreground">Em vez de um dia fixo do mês</p>
            </div>
            <Switch
              checked={!!value.monthly_last_business_day}
              onCheckedChange={(c) => set({ monthly_last_business_day: c })}
              aria-label="Cobrar no último dia útil"
            />
          </div>

          {!value.monthly_last_business_day && (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Dia do vencimento</Label>
              <Select
                value={value.day_of_month ? String(value.day_of_month) : ""}
                onValueChange={(v) => set({ day_of_month: Number(v) })}
              >
                <SelectTrigger id="day_of_month" className="min-h-11">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Valor mensal</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={(value.monthly_amount_mode || "auto") === "auto" ? "default" : "outline"}
                className="min-h-11 text-xs sm:text-sm"
                onClick={() => set({ monthly_amount_mode: "auto" })}
              >
                Calcular pelas sessões
              </Button>
              <Button
                type="button"
                size="sm"
                variant={value.monthly_amount_mode === "fixed" ? "default" : "outline"}
                className="min-h-11 text-xs sm:text-sm"
                onClick={() =>
                  set({ monthly_amount_mode: "fixed", monthly_amount: value.monthly_amount ?? projection.monthlyAverage })
                }
              >
                Valor fixo
              </Button>
            </div>
            {value.monthly_amount_mode === "fixed" ? (
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="min-h-11"
                aria-label="Valor mensal fixo"
                value={value.monthly_amount ?? ""}
                onChange={(e) =>
                  set({ monthly_amount: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Automático: {fmt(projection.monthlyAverage)} / mês
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------- PERSONALIZADO ---------- */}
      {value.billing_type === "custom" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="custom_interval_days">Cobrar a cada (dias)</Label>
            <Input
              id="custom_interval_days"
              type="number"
              min={1}
              className="min-h-11"
              placeholder="21"
              value={value.custom_interval_days ?? ""}
              onChange={(e) =>
                set({
                  custom_interval_days: e.target.value === "" ? null : Number(e.target.value),
                  custom_days_of_month: [],
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_days">Ou dias fixos do mês (ex: 5, 20)</Label>
            <Input
              id="custom_days"
              className="min-h-11"
              placeholder="5, 20"
              value={(value.custom_days_of_month || []).join(", ")}
              onChange={(e) =>
                set({
                  custom_days_of_month: e.target.value
                    .split(",")
                    .map((s) => Number(s.trim()))
                    .filter((n) => n >= 1 && n <= 31),
                  custom_interval_days: null,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="custom_first">Primeira cobrança</Label>
              <Input
                id="custom_first"
                type="date"
                className="min-h-11"
                value={value.first_charge_date || ""}
                onChange={(e) => set({ first_charge_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom_end">Término (opcional)</Label>
              <Input
                id="custom_end"
                type="date"
                className="min-h-11"
                value={value.ends_on || ""}
                onChange={(e) => set({ ends_on: e.target.value || null })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------- PROJEÇÕES ---------- */}
      <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">{BILLING_TYPE_LABEL[value.billing_type]}</Badge>
          <span className="text-xs text-muted-foreground">{describeBilling(value, sessionFrequency)}</span>
        </div>
        {Number(value.session_value) > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Por cobrança</p>
              <p className="font-semibold">{fmt(projection.perCharge)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Média mensal</p>
              <p className="font-semibold">{fmt(projection.monthlyAverage)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Projeção anual</p>
              <p className="font-semibold">{fmt(projection.yearly)}</p>
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Próximas cobranças: {upcoming.map(fmtDate).join(" · ")}
          </p>
        )}
      </div>

      {/* ---------- CONSISTÊNCIA ---------- */}
      {issues.map((issue, i) => (
        <Alert
          key={i}
          variant={issue.severity === "error" ? "destructive" : "default"}
          className="py-2"
        >
          {issue.severity === "info" ? (
            <Info className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription className="text-xs flex flex-wrap items-center gap-2">
            <span>{issue.message}</span>
            {issue.suggested_value != null && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => set({ monthly_amount: issue.suggested_value })}
              >
                <Wand2 className="h-3 w-3" /> {issue.suggestion || "Recalcular"}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
