import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, CheckCircle2, Info, Repeat } from "lucide-react";

export type SessionFrequency = "semanal" | "quinzenal" | "mensal" | "avulso";

export interface PatientFormData {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  notes: string;
  default_session_value: string;
  payment_day: string;
  monthly_plan_value: string;
  frequency: SessionFrequency;
}

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  submitLabel?: string;
  loading?: boolean;
  onCancel?: () => void;
  extraContent?: React.ReactNode;
  compact?: boolean;
  /** Called whenever financial fields change so parent can sync scheduling */
  onFinancialChange?: (data: { sessionValue: string; frequency: SessionFrequency; monthlyPlan: string }) => void;
}

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

function calcMonthlyPlan(sessionValue: string, frequency: SessionFrequency): string {
  const val = parseFloat(sessionValue);
  if (!val || isNaN(val)) return "";
  switch (frequency) {
    case "semanal": return (val * 4).toFixed(2);
    case "quinzenal": return (val * 2).toFixed(2);
    case "mensal": return val.toFixed(2);
    case "avulso": return "";
    default: return "";
  }
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const FREQUENCY_OPTIONS: { value: SessionFrequency; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "avulso", label: "Avulso" },
];

export function PatientForm({
  initialData,
  onSubmit,
  submitLabel = "Salvar",
  loading = false,
  onCancel,
  extraContent,
  compact = false,
  onFinancialChange,
}: PatientFormProps) {
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [cpf, setCpf] = useState(initialData?.cpf || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialData?.emergency_phone || "");
  const [sessionValue, setSessionValue] = useState(initialData?.default_session_value || "");
  const [frequency, setFrequency] = useState<SessionFrequency>(initialData?.frequency || "semanal");
  const [monthlyPlan, setMonthlyPlan] = useState(initialData?.monthly_plan_value || "");
  const [monthlyPlanManual, setMonthlyPlanManual] = useState(false);

  useEffect(() => {
    if (initialData) {
      setPhone(initialData.phone || "");
      setCpf(initialData.cpf || "");
      setEmergencyPhone(initialData.emergency_phone || "");
      setSessionValue(initialData.default_session_value || "");
      setFrequency(initialData.frequency || "semanal");
      setMonthlyPlan(initialData.monthly_plan_value || "");
    }
  }, [initialData]);

  // Auto-calc monthly plan when session value or frequency changes (unless manual override)
  useEffect(() => {
    if (!monthlyPlanManual) {
      const calculated = calcMonthlyPlan(sessionValue, frequency);
      setMonthlyPlan(calculated);
    }
  }, [sessionValue, frequency, monthlyPlanManual]);

  // Notify parent of financial field changes
  useEffect(() => {
    onFinancialChange?.({ sessionValue, frequency, monthlyPlan });
  }, [sessionValue, frequency, monthlyPlan]);

  const handleMonthlyPlanChange = (val: string) => {
    setMonthlyPlanManual(true);
    setMonthlyPlan(val);
  };

  const handleFrequencyChange = (val: SessionFrequency) => {
    setFrequency(val);
    setMonthlyPlanManual(false); // reset manual override on frequency change
  };

  const handleSessionValueChange = (val: string) => {
    setSessionValue(val);
    setMonthlyPlanManual(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      full_name: fd.get("full_name") as string,
      email: (fd.get("email") as string) || "",
      phone,
      cpf,
      birth_date: (fd.get("birth_date") as string) || "",
      address: (fd.get("address") as string) || "",
      emergency_contact: (fd.get("emergency_contact") as string) || "",
      emergency_phone: emergencyPhone,
      notes: (fd.get("notes") as string) || "",
      default_session_value: sessionValue,
      payment_day: (fd.get("payment_day") as string) || "",
      monthly_plan_value: monthlyPlan,
      frequency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Dados Pessoais</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input id="full_name" name="full_name" required defaultValue={initialData?.full_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={initialData?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input id="birth_date" name="birth_date" type="date" defaultValue={initialData?.birth_date} />
          </div>
          {!compact && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" placeholder="Rua, número, bairro, cidade - UF" defaultValue={initialData?.address} />
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Contato de Emergência</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Nome do Contato</Label>
              <Input id="emergency_contact" name="emergency_contact" defaultValue={initialData?.emergency_contact} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Telefone de Emergência</Label>
              <Input id="emergency_phone" name="emergency_phone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />Dados Financeiros
        </h3>

        {/* Frequency selector */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <Repeat className="h-3.5 w-3.5 mr-1.5" />
            Frequência do Atendimento
            <InfoTooltip text="Define a periodicidade dos atendimentos e calcula automaticamente o plano mensal." />
          </Label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={frequency === opt.value ? "default" : "outline"}
                onClick={() => handleFrequencyChange(opt.value)}
                className="flex-1"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default_session_value" className="flex items-center">
              Valor da Sessão (R$)
              <InfoTooltip text="Valor cobrado por cada atendimento realizado." />
            </Label>
            <Input
              id="default_session_value"
              name="default_session_value"
              type="number"
              step="0.01"
              placeholder="200.00"
              value={sessionValue}
              onChange={(e) => handleSessionValueChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_day" className="flex items-center">
              Dia de Pagamento
              <InfoTooltip text="Dia do mês em que o paciente realiza o pagamento." />
            </Label>
            <Select name="payment_day" defaultValue={initialData?.payment_day || ""}>
              <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_plan_value" className="flex items-center">
              Plano Mensal (R$)
              <InfoTooltip text="Valor total mensal baseado na frequência dos atendimentos. Calculado automaticamente mas pode ser editado." />
            </Label>
            <div className="relative">
              <Input
                id="monthly_plan_value"
                name="monthly_plan_value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={monthlyPlan}
                onChange={(e) => handleMonthlyPlanChange(e.target.value)}
              />
              {!monthlyPlanManual && monthlyPlan && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  auto
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Observações sobre o paciente..." defaultValue={initialData?.notes} />
      </div>

      {extraContent}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? <span className="animate-pulse">Processando...</span> : <><CheckCircle2 className="h-4 w-4" />{submitLabel}</>}
        </Button>
      </div>
    </form>
  );
}
