import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, CheckCircle2, Info, Repeat, ChevronDown, FileHeart, MapPin, Users, Stethoscope } from "lucide-react";
import { useConsistencyCheck } from "@/hooks/useConsistencyCheck";
import { ConsistencyDialog } from "@/components/shared/ConsistencyDialog";
import { BillingConfiguration } from "@/components/shared/BillingConfiguration";
import {
  projectBilling,
  type BillingConfig,
  type SessionFrequency as BillingSessionFrequency,
} from "@/lib/billing-rules-engine";
import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import { draftKeys } from "@/lib/draft-engine";
import { DraftStatusIndicator } from "@/components/drafts/DraftStatusIndicator";
import { DraftRecoveryBanner } from "@/components/drafts/DraftRecoveryBanner";


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
  // identification
  social_name?: string;
  birth_place?: string;
  gender?: string;
  marital_status?: string;
  rg?: string;
  rg_issuer?: string;
  cnh?: string;
  religion?: string;
  // professional
  profession?: string;
  profession_role?: string;
  company?: string;
  education_level?: string;
  // structured address
  cep?: string;
  street?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  // contact extra
  whatsapp_phone?: string;
  phone_residential?: string;
  emergency_relationship?: string;
  emergency_whatsapp?: string;
  // family
  father_name?: string;
  father_profession?: string;
  mother_name?: string;
  mother_profession?: string;
  siblings_brothers?: string;
  siblings_sisters?: string;
  spouse_name?: string;
  spouse_relationship_time?: string;
  // clinical
  initial_demand?: string;
  prior_therapy?: boolean;
  prior_therapy_when?: string;
  prior_therapy_duration?: string;
  prior_therapy_reason?: string;
  uses_medication?: boolean;
  // health plan
  health_plan?: string;
  health_plan_id?: string;
}

export interface PatientDraftApi {
  /** Remove o rascunho de todas as camadas — chame só após o backend confirmar. */
  commit: () => Promise<void>;
  /** Persiste imediatamente (fechar modal, trocar de página). */
  saveNow: () => Promise<void>;
}

export interface PatientDraftScope {
  mode: "new" | "edit";
  entityId?: string | null;
  userId?: string | null;
  /** updated_at da versão oficial salva */
  savedAt?: string | null;
  label?: string | null;
}

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  submitLabel?: string;
  loading?: boolean;
  onCancel?: () => void;
  extraContent?: React.ReactNode;
  compact?: boolean;
  onFinancialChange?: (data: { sessionValue: string; frequency: SessionFrequency; monthlyPlan: string }) => void;
  /** Ativa o Draft Engine (Zero Data Loss) neste formulário */
  draft?: PatientDraftScope;
  draftApiRef?: React.MutableRefObject<PatientDraftApi | null>;
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

const formatCEP = (value: string): string => {
  const n = value.replace(/\D/g, "");
  if (n.length <= 5) return n;
  return `${n.slice(0, 5)}-${n.slice(5, 8)}`;
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
  initialData: initialDataProp,
  onSubmit,
  submitLabel = "Salvar",
  loading = false,
  onCancel,
  extraContent,
  compact = false,
  onFinancialChange,
  draft,
  draftApiRef,
}: PatientFormProps) {
  // Rascunho restaurado sobrepõe os dados oficiais carregados
  const [draftOverride, setDraftOverride] = useState<Partial<PatientFormData> | null>(null);
  const [formKey, setFormKey] = useState(0);
  const initialData = useMemo<Partial<PatientFormData> | undefined>(
    () => (draftOverride ? { ...(initialDataProp || {}), ...draftOverride } : initialDataProp),
    [initialDataProp, draftOverride],
  );

  const [phone, setPhone] = useState(initialData?.phone || "");

  const [cpf, setCpf] = useState(initialData?.cpf || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialData?.emergency_phone || "");
  const [emergencyWa, setEmergencyWa] = useState(initialData?.emergency_whatsapp || "");
  const [whatsappPhone, setWhatsappPhone] = useState(initialData?.whatsapp_phone || "");
  const [residentialPhone, setResidentialPhone] = useState(initialData?.phone_residential || "");
  const [cep, setCep] = useState(initialData?.cep || "");
  const [street, setStreet] = useState(initialData?.street || "");
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [sessionValue, setSessionValue] = useState(initialData?.default_session_value || "");
  const [frequency, setFrequency] = useState<SessionFrequency>(initialData?.frequency || "semanal");
  const [monthlyPlan, setMonthlyPlan] = useState(initialData?.monthly_plan_value || "");
  const [monthlyPlanManual, setMonthlyPlanManual] = useState(false);
  // Configuração de cobrança (motor único de regras)
  const [billing, setBilling] = useState<BillingConfig>(() => ({
    billing_type: initialData?.payment_day ? "monthly" : "per_session",
    session_value: initialData?.default_session_value
      ? Number(initialData.default_session_value)
      : null,
    session_payment_timing: "on_session",
    weekly_offset: 0,
    weekly_weekday: null,
    biweekly_mode: "every_14_days",
    twice_month_days: [5, 20],
    day_of_month: initialData?.payment_day ? Number(initialData.payment_day) : null,
    monthly_amount_mode: initialData?.monthly_plan_value ? "fixed" : "auto",
    monthly_amount: initialData?.monthly_plan_value
      ? Number(initialData.monthly_plan_value)
      : null,
  }));
  const [priorTherapy, setPriorTherapy] = useState(!!initialData?.prior_therapy);
  const [usesMedication, setUsesMedication] = useState(!!initialData?.uses_medication);

  useEffect(() => {
    if (initialData) {
      setPhone(initialData.phone || "");
      setCpf(initialData.cpf || "");
      setEmergencyPhone(initialData.emergency_phone || "");
      setEmergencyWa(initialData.emergency_whatsapp || "");
      setWhatsappPhone(initialData.whatsapp_phone || "");
      setResidentialPhone(initialData.phone_residential || "");
      setCep(initialData.cep || "");
      setStreet(initialData.street || "");
      setNeighborhood(initialData.neighborhood || "");
      setCity(initialData.city || "");
      setState(initialData.state || "");
      setSessionValue(initialData.default_session_value || "");
      setFrequency(initialData.frequency || "semanal");
      setMonthlyPlan(initialData.monthly_plan_value || "");
      setPriorTherapy(!!initialData.prior_therapy);
      setUsesMedication(!!initialData.uses_medication);
    }
  }, [initialData]);

  // Valor da sessão é a fonte única — espelha no motor de cobrança
  useEffect(() => {
    const n = sessionValue === "" ? null : Number(sessionValue);
    setBilling((prev) => (prev.session_value === n ? prev : { ...prev, session_value: n }));
  }, [sessionValue]);

  // Plano mensal derivado do motor (nunca pedido duas vezes)
  useEffect(() => {
    if (monthlyPlanManual) return;
    const p = projectBilling(billing, frequency as BillingSessionFrequency);
    setMonthlyPlan(p.monthlyAverage > 0 ? p.monthlyAverage.toFixed(2) : "");
  }, [billing, frequency, monthlyPlanManual]);

  useEffect(() => {
    onFinancialChange?.({ sessionValue, frequency, monthlyPlan });
  }, [sessionValue, frequency, monthlyPlan]);

  async function lookupCep(raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        if (d.logradouro) setStreet(d.logradouro);
        if (d.bairro) setNeighborhood(d.bairro);
        if (d.localidade) setCity(d.localidade);
        if (d.uf) setState(d.uf);
      }
    } catch {}
  }

  const { issues, check, clear, loading: checking } = useConsistencyCheck();
  const [pendingData, setPendingData] = useState<PatientFormData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const buildPayload = (form: HTMLFormElement): PatientFormData => {
    const fd = new FormData(form);
    const opt = (k: string) => {
      const v = fd.get(k);
      return v ? String(v) : undefined;
    };
    return {
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
      // Apenas cobrança mensal possui "dia de vencimento"
      payment_day:
        billing.billing_type === "monthly" && billing.day_of_month
          ? String(billing.day_of_month)
          : "",
      monthly_plan_value: monthlyPlan,
      frequency,
      social_name: opt("social_name"),
      birth_place: opt("birth_place"),
      gender: opt("gender"),
      marital_status: opt("marital_status"),
      rg: opt("rg"),
      rg_issuer: opt("rg_issuer"),
      cnh: opt("cnh"),
      religion: opt("religion"),
      profession: opt("profession"),
      profession_role: opt("profession_role"),
      company: opt("company"),
      education_level: opt("education_level"),
      cep,
      street,
      address_number: opt("address_number"),
      complement: opt("complement"),
      neighborhood,
      city,
      state,
      whatsapp_phone: whatsappPhone || undefined,
      phone_residential: residentialPhone || undefined,
      emergency_relationship: opt("emergency_relationship"),
      emergency_whatsapp: emergencyWa || undefined,
      father_name: opt("father_name"),
      father_profession: opt("father_profession"),
      mother_name: opt("mother_name"),
      mother_profession: opt("mother_profession"),
      siblings_brothers: opt("siblings_brothers"),
      siblings_sisters: opt("siblings_sisters"),
      spouse_name: opt("spouse_name"),
      spouse_relationship_time: opt("spouse_relationship_time"),
      initial_demand: opt("initial_demand"),
      prior_therapy: priorTherapy,
      prior_therapy_when: opt("prior_therapy_when"),
      prior_therapy_duration: opt("prior_therapy_duration"),
      prior_therapy_reason: opt("prior_therapy_reason"),
      uses_medication: usesMedication,
      health_plan: opt("health_plan"),
      health_plan_id: opt("health_plan_id"),
    };
  };

  // ── Draft Engine (Zero Data Loss) ──
  const formRef = useRef<HTMLFormElement | null>(null);
  const [snapshot, setSnapshot] = useState<PatientFormData | null>(null);
  const [changeTick, setChangeTick] = useState(0);

  const draftKey = useMemo(() => {
    if (!draft) return null;
    if (draft.mode === "edit") return draft.entityId ? draftKeys.patientEdit(draft.entityId) : null;
    return draft.userId ? draftKeys.patientNew(draft.userId) : null;
  }, [draft]);

  const {
    status: draftStatus,
    isOnline,
    lastLocalAt,
    lastSyncedAt,
    pendingDraft,
    checkForDraft,
    restore,
    discard,
    commit,
    saveNow,
    setBaseline,
  } = useDraftRecovery<PatientFormData>({
    draftKey,
    entityType: "patient",
    entityId: draft?.entityId ?? null,
    userId: draft?.userId ?? null,
    data: snapshot,
    enabled: !!draftKey,
    label: draft?.label ?? null,
    savedAt: draft?.savedAt ?? null,
  });

  // Captura o estado completo do formulário a cada alteração
  useEffect(() => {
    if (!draftKey || !formRef.current) return;
    setSnapshot(buildPayload(formRef.current));
  }, [
    draftKey,
    changeTick,
    phone,
    cpf,
    emergencyPhone,
    emergencyWa,
    whatsappPhone,
    residentialPhone,
    cep,
    street,
    neighborhood,
    city,
    state,
    sessionValue,
    frequency,
    monthlyPlan,
    priorTherapy,
    usesMedication,
  ]);

  // Define a linha de base e procura rascunho pendente ao montar
  useEffect(() => {
    if (!draftKey) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (formRef.current) setBaseline(buildPayload(formRef.current));
      void checkForDraft().then(() => {
        if (cancelled) return;
      });
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draftKey]);

  useEffect(() => {
    if (!draftApiRef) return;
    draftApiRef.current = { commit: () => commit(), saveNow };
    return () => {
      if (draftApiRef) draftApiRef.current = null;
    };
  }, [draftApiRef, commit, saveNow]);

  const applyDraft = (payload: Partial<PatientFormData>) => {
    setDraftOverride(payload);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = buildPayload(e.currentTarget);
    // Validação inteligente (IA + local) antes de salvar
    const found = await check("patient", { ...data, zip_code: cep }, true);
    if (found.length === 0) {
      onSubmit(data);
      return;
    }
    setPendingData(data);
    setConfirmOpen(true);
  };

  const confirmSave = () => {
    if (pendingData) onSubmit(pendingData);
    setConfirmOpen(false);
    setPendingData(null);
    clear();
  };

  const init: any = initialData || {};

  return (
    <form
      key={formKey}
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={() => draftKey && setChangeTick((t) => t + 1)}
      onChange={() => draftKey && setChangeTick((t) => t + 1)}
      className="space-y-6"
    >
      {draftKey && (
        <div className="flex items-center justify-between gap-2">
          <DraftStatusIndicator
            status={draftStatus}
            isOnline={isOnline}
            lastLocalAt={lastLocalAt}
            lastSyncedAt={lastSyncedAt}
          />
        </div>
      )}

      {pendingDraft && (
        <DraftRecoveryBanner
          draft={pendingDraft}
          savedData={initialDataProp || {}}
          onRestore={() => restore(applyDraft)}
          onDiscard={() => void discard()}
        />
      )}

      {/* Dados Pessoais */}
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
              <Label htmlFor="address">Endereço resumido</Label>
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
            <div className="space-y-2">
              <Label htmlFor="emergency_relationship">Grau de parentesco</Label>
              <Input id="emergency_relationship" name="emergency_relationship" placeholder="Mãe, irmão, cônjuge…" defaultValue={init.emergency_relationship} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_whatsapp">WhatsApp de emergência</Label>
              <Input id="emergency_whatsapp" name="emergency_whatsapp" value={emergencyWa} onChange={(e) => setEmergencyWa(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Financeiro */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />Dados Financeiros
        </h3>
        <div className="space-y-2">
          <Label className="flex items-center">
            <Repeat className="h-3.5 w-3.5 mr-1.5" />
            Frequência do Atendimento
            <InfoTooltip text="Define a periodicidade e calcula automaticamente o plano mensal." />
          </Label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <Button key={opt.value} type="button" size="sm" variant={frequency === opt.value ? "default" : "outline"} onClick={() => { setFrequency(opt.value); setMonthlyPlanManual(false); }} className="flex-1">
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default_session_value">Valor da Sessão (R$)</Label>
            <Input id="default_session_value" name="default_session_value" type="number" step="0.01" placeholder="200.00" value={sessionValue} onChange={(e) => { setSessionValue(e.target.value); setMonthlyPlanManual(false); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_day">Dia de Pagamento</Label>
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
            <Label htmlFor="monthly_plan_value">Plano Mensal (R$)</Label>
            <div className="relative">
              <Input id="monthly_plan_value" name="monthly_plan_value" type="number" step="0.01" placeholder="0.00" value={monthlyPlan} onChange={(e) => { setMonthlyPlanManual(true); setMonthlyPlan(e.target.value); }} />
              {!monthlyPlanManual && monthlyPlan && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">auto</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Observações sobre o paciente..." defaultValue={initialData?.notes} />
      </div>

      {!compact && (
        <>
          {/* Identificação avançada */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><FileHeart className="h-4 w-4" /> Identificação completa & Profissional</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nome social</Label><Input name="social_name" defaultValue={init.social_name} /></div>
                <div className="space-y-2"><Label>Naturalidade</Label><Input name="birth_place" defaultValue={init.birth_place} placeholder="Cidade de nascimento" /></div>
                <div className="space-y-2"><Label>Gênero</Label>
                  <Select name="gender" defaultValue={init.gender || ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="nao_binario">Não-binário</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Estado civil</Label>
                  <Select name="marital_status" defaultValue={init.marital_status || ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União estável</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>RG</Label><Input name="rg" defaultValue={init.rg} /></div>
                <div className="space-y-2"><Label>Órgão expedidor</Label><Input name="rg_issuer" defaultValue={init.rg_issuer} placeholder="SSP/SP" /></div>
                <div className="space-y-2"><Label>CNH</Label><Input name="cnh" defaultValue={init.cnh} /></div>
                <div className="space-y-2"><Label>Religião</Label><Input name="religion" defaultValue={init.religion} /></div>
                <div className="space-y-2"><Label>Profissão</Label><Input name="profession" defaultValue={init.profession} /></div>
                <div className="space-y-2"><Label>Cargo / função</Label><Input name="profession_role" defaultValue={init.profession_role} /></div>
                <div className="space-y-2"><Label>Empresa</Label><Input name="company" defaultValue={init.company} /></div>
                <div className="space-y-2"><Label>Escolaridade</Label>
                  <Select name="education_level" defaultValue={init.education_level || ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fund_inc">Fundamental Incompleto</SelectItem>
                      <SelectItem value="fund_comp">Fundamental Completo</SelectItem>
                      <SelectItem value="medio_inc">Médio Incompleto</SelectItem>
                      <SelectItem value="medio_comp">Médio Completo</SelectItem>
                      <SelectItem value="sup_inc">Superior Incompleto</SelectItem>
                      <SelectItem value="sup_comp">Superior Completo</SelectItem>
                      <SelectItem value="pos">Pós-graduação</SelectItem>
                      <SelectItem value="mestrado">Mestrado</SelectItem>
                      <SelectItem value="doutorado">Doutorado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>WhatsApp</Label><Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} /></div>
                <div className="space-y-2"><Label>Telefone residencial</Label><Input value={residentialPhone} onChange={(e) => setResidentialPhone(formatPhone(e.target.value))} placeholder="(00) 0000-0000" maxLength={15} /></div>
                <div className="space-y-2"><Label>Plano de saúde</Label><Input name="health_plan" defaultValue={init.health_plan} /></div>
                <div className="space-y-2"><Label>Carteirinha</Label><Input name="health_plan_id" defaultValue={init.health_plan_id} /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Endereço estruturado */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereço detalhado</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid md:grid-cols-6 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>CEP</Label>
                  <Input value={cep} onChange={(e) => { const v = formatCEP(e.target.value); setCep(v); if (v.replace(/\D/g, "").length === 8) lookupCep(v); }} placeholder="00000-000" maxLength={9} />
                </div>
                <div className="space-y-2 md:col-span-4"><Label>Rua / Logradouro</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Número</Label><Input name="address_number" defaultValue={init.address_number} /></div>
                <div className="space-y-2 md:col-span-4"><Label>Complemento</Label><Input name="complement" defaultValue={init.complement} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Bairro</Label><Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></div>
                <div className="space-y-2 md:col-span-3"><Label>Cidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div className="space-y-2 md:col-span-1"><Label>UF</Label><Input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} /></div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Família */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Família</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nome do pai</Label><Input name="father_name" defaultValue={init.father_name} /></div>
                <div className="space-y-2"><Label>Profissão do pai</Label><Input name="father_profession" defaultValue={init.father_profession} /></div>
                <div className="space-y-2"><Label>Nome da mãe</Label><Input name="mother_name" defaultValue={init.mother_name} /></div>
                <div className="space-y-2"><Label>Profissão da mãe</Label><Input name="mother_profession" defaultValue={init.mother_profession} /></div>
                <div className="space-y-2"><Label>Irmãos (homens)</Label><Input type="number" min={0} name="siblings_brothers" defaultValue={init.siblings_brothers} /></div>
                <div className="space-y-2"><Label>Irmãs (mulheres)</Label><Input type="number" min={0} name="siblings_sisters" defaultValue={init.siblings_sisters} /></div>
                <div className="space-y-2"><Label>Cônjuge</Label><Input name="spouse_name" defaultValue={init.spouse_name} /></div>
                <div className="space-y-2"><Label>Tempo de relacionamento</Label><Input name="spouse_relationship_time" defaultValue={init.spouse_relationship_time} placeholder="Ex: 5 anos" /></div>
              </div>
              <p className="text-xs text-muted-foreground">Filhos e medicações detalhadas são preenchidos pelo paciente via formulário enviado.</p>
            </CollapsibleContent>
          </Collapsible>

          {/* Histórico clínico */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Histórico clínico & Demanda</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Demanda inicial</Label>
                <Textarea name="initial_demand" rows={3} placeholder="Motivo da procura por atendimento psicológico..." defaultValue={init.initial_demand} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Já realizou psicoterapia antes?</p>
                  <p className="text-xs text-muted-foreground">Marque para registrar tratamentos anteriores</p>
                </div>
                <Switch checked={priorTherapy} onCheckedChange={setPriorTherapy} />
              </div>
              {priorTherapy && (
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Quando</Label><Input name="prior_therapy_when" defaultValue={init.prior_therapy_when} placeholder="Ex: 2022" /></div>
                  <div className="space-y-2"><Label>Duração</Label><Input name="prior_therapy_duration" defaultValue={init.prior_therapy_duration} placeholder="Ex: 8 meses" /></div>
                  <div className="space-y-2 md:col-span-3"><Label>Motivo</Label><Textarea name="prior_therapy_reason" rows={2} defaultValue={init.prior_therapy_reason} /></div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Faz uso de medicação?</p>
                  <p className="text-xs text-muted-foreground">Detalhes das medicações são informados pelo paciente</p>
                </div>
                <Switch checked={usesMedication} onCheckedChange={setUsesMedication} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {extraContent}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" disabled={loading || checking} className="gap-2">
          {loading || checking ? <span className="animate-pulse">{checking ? "Validando..." : "Processando..."}</span> : <><CheckCircle2 className="h-4 w-4" />{submitLabel}</>}
        </Button>
      </div>
      <ConsistencyDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        issues={issues}
        onConfirm={confirmSave}
        confirmLabel="Salvar mesmo assim"
      />
    </form>
  );
}
