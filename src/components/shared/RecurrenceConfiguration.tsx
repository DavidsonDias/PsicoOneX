import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import {
  describeRecurrence,
  generateOccurrences,
  smartStartDate,
  type RecurrenceConfig,
  type TerminationMode,
} from "@/lib/scheduling-rules-engine";
import { WEEKDAY_LABEL, type SessionFrequency } from "@/lib/billing-rules-engine";

const FREQS: { v: SessionFrequency; l: string }[] = [
  { v: "avulso", l: "Avulsa" },
  { v: "semanal", l: "Semanal" },
  { v: "quinzenal", l: "Quinzenal" },
  { v: "mensal", l: "Mensal" },
  { v: "personalizado", l: "Personalizada" },
];

const TERMS: { v: TerminationMode; l: string }[] = [
  { v: "count", l: "Número de sessões" },
  { v: "until", l: "Até uma data" },
  { v: "open_ended", l: "Sem prazo definido" },
];

interface Props {
  value: RecurrenceConfig;
  onChange: (next: RecurrenceConfig) => void;
  className?: string;
}

const fmtDate = (ymd: string) => ymd.split("-").reverse().join("/");

export function RecurrenceConfiguration({ value, onChange, className }: Props) {
  const set = (patch: Partial<RecurrenceConfig>) => onChange({ ...value, ...patch });

  const preview = useMemo(() => generateOccurrences(value).slice(0, 4), [value]);
  const weekday = useMemo(() => {
    const [y, m, d] = (value.startDate || "").split("-").map(Number);
    if (!y) return null;
    return new Date(y, (m || 1) - 1, d || 1).getDay();
  }, [value.startDate]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Repeat className="h-3.5 w-3.5" /> Frequência de Atendimento
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {FREQS.map((f) => (
            <Button
              key={f.v}
              type="button"
              size="sm"
              aria-pressed={value.frequency === f.v}
              variant={value.frequency === f.v ? "default" : "outline"}
              className="min-h-11 text-xs sm:text-sm"
              onClick={() => set({ frequency: f.v })}
            >
              {f.l}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rec_start">Primeira sessão</Label>
          <Input
            id="rec_start"
            type="date"
            className="min-h-11"
            value={value.startDate || ""}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          {weekday != null && (
            <p className="text-xs text-muted-foreground">{WEEKDAY_LABEL[weekday]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rec_time">Horário</Label>
          <Input
            id="rec_time"
            type="time"
            className="min-h-11"
            value={value.time || ""}
            onChange={(e) => set({ time: e.target.value })}
          />
        </div>
      </div>

      {/* Datas inteligentes: escolher o dia da semana já define a próxima data */}
      {value.frequency !== "avulso" && (
        <div className="space-y-2">
          <Label>Dia da semana</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABEL.map((l, i) => (
              <Button
                key={i}
                type="button"
                size="sm"
                variant={weekday === i ? "default" : "outline"}
                className="min-h-11 text-xs"
                onClick={() => set({ startDate: smartStartDate(i) })}
              >
                {l.slice(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {value.frequency === "personalizado" && (
        <div className="space-y-2">
          <Label htmlFor="rec_interval">Repetir a cada (dias)</Label>
          <Input
            id="rec_interval"
            type="number"
            min={1}
            className="min-h-11"
            placeholder="21"
            value={value.customIntervalDays ?? ""}
            onChange={(e) =>
              set({ customIntervalDays: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>
      )}

      {value.frequency !== "avulso" && (
        <div className="space-y-2">
          <Label>Término</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TERMS.map((t) => (
              <Button
                key={t.v}
                type="button"
                size="sm"
                variant={value.termination === t.v ? "default" : "outline"}
                className="min-h-11 text-xs sm:text-sm"
                onClick={() => set({ termination: t.v })}
              >
                {t.l}
              </Button>
            ))}
          </div>

          {value.termination === "count" && (
            <Input
              type="number"
              min={1}
              max={200}
              className="min-h-11"
              aria-label="Número de sessões"
              value={value.occurrences ?? 8}
              onChange={(e) => set({ occurrences: Number(e.target.value) })}
            />
          )}
          {value.termination === "until" && (
            <Input
              type="date"
              className="min-h-11"
              aria-label="Data final"
              value={value.untilDate || ""}
              onChange={(e) => set({ untilDate: e.target.value })}
            />
          )}
          {value.termination === "open_ended" && (
            <p className="text-xs text-muted-foreground">
              Criaremos os próximos {value.rollingWindowDays ?? 90} dias e estenderemos automaticamente.
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
        <Badge variant="secondary" className="text-xs">{describeRecurrence(value)}</Badge>
        {preview.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Próximas sessões: {preview.map(fmtDate).join(" · ")}
            {value.time ? ` às ${value.time}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
