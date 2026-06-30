import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PatientCombobox } from "@/components/shared/PatientCombobox";
import { Sparkles, Repeat, Calendar as CalendarIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

/**
 * SmartTransactionDialog — UNIFIED Financial Launcher
 * ---------------------------------------------------
 * One form for every financial action across the app:
 *  - Nova Transação (Pagamentos tab)
 *  - Nova Cobrança (Stripe tab)
 *  - Novo Plano de Cobrança (recurring) — toggle "Recorrente"
 *  - Registrar Pagamento (PatientProfile)
 *  - Editar Transação
 *
 * Modes:
 *  - mode="single"     → financial_transactions (income/expense)
 *  - mode="recurring"  → patient_billing_plans (weekly/biweekly/monthly/per_session)
 *
 * Smart logic:
 *  - Reads patient cadastro: default_session_value, monthly_plan_value, payment_day
 *  - Reads active patient_billing_plans → infers frequency & autofills amount/due_date
 *  - Mobile-first responsive grid (1 col → 2 cols ≥ sm)
 */

interface PatientLite {
  id: string;
  full_name: string;
  default_session_value?: number | null;
  monthly_plan_value?: number | null;
  payment_day?: number | null;
}

interface ActivePlan {
  id: string;
  billing_type: "per_session" | "weekly" | "biweekly" | "monthly";
  amount: number;
  day_of_month: number | null;
  start_date: string | null;
  description: string | null;
}

interface NextPendingInstallment {
  id: string;
  amount: number;
  due_date: string;
  description: string | null;
  payment_method: string | null;
  status: string;
}

export interface EditingTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  due_date: string;
  patient_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lockedPatient?: PatientLite | null;
  onCreated?: () => void;
  defaultType?: "income" | "expense";
  defaultMode?: "single" | "recurring";
  editing?: EditingTransaction | null;
  /** lock the mode switch (e.g. force recurring from "Novo plano") */
  lockMode?: boolean;
}

const INCOME_CATEGORIES = [
  "Consulta psicológica", "Pacote mensal", "Avaliação / Laudo",
  "Atendimento online", "Atendimento presencial", "Supervisão", "Workshop", "Outros",
];
const EXPENSE_CATEGORIES = [
  "Ferramentas / Software", "Marketing", "Operacional",
  "Aluguel consultório", "Impostos", "Equipamentos", "Outros",
];

const RECURRING_HELP: Record<string, string> = {
  per_session: "Sem cobrança fixa — cada agendamento gera uma cobrança individual.",
  weekly: "Cobrança a cada 7 dias a partir da data inicial.",
  biweekly: "Cobrança a cada 15 dias a partir da data inicial.",
  monthly: "Cobrança mensal em um dia fixo escolhido.",
};

function smartDueDateFromDay(day: number): string {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const target = day < d ? new Date(y, m + 1, day) : new Date(y, m, day);
  return format(target, "yyyy-MM-dd");
}

function smartDueDateFromPlan(plan: ActivePlan): string {
  if (plan.billing_type === "monthly" && plan.day_of_month) return smartDueDateFromDay(plan.day_of_month);
  if (plan.billing_type === "weekly") return format(addDays(new Date(), 7), "yyyy-MM-dd");
  if (plan.billing_type === "biweekly") return format(addDays(new Date(), 15), "yyyy-MM-dd");
  return format(new Date(), "yyyy-MM-dd");
}

function suggestDescription(name: string, planType?: ActivePlan["billing_type"], category?: string) {
  if (planType === "monthly") return `Plano mensal — ${name}`;
  if (planType === "weekly") return `Sessão semanal — ${name}`;
  if (planType === "biweekly") return `Sessão quinzenal — ${name}`;
  if (category === "Pacote mensal") return `Plano mensal — ${name}`;
  if (category === "Avaliação / Laudo") return `Avaliação — ${name}`;
  return `Sessão de psicoterapia — ${name}`;
}

const PLAN_LABEL: Record<ActivePlan["billing_type"], string> = {
  per_session: "Por sessão",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function SmartTransactionDialog({
  open, onOpenChange, lockedPatient = null, onCreated,
  defaultType = "income", defaultMode = "single", editing = null, lockMode = false,
}: Props) {
  const isEdit = !!editing;
  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [nextPending, setNextPending] = useState<NextPendingInstallment | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"single" | "recurring">(isEdit ? "single" : defaultMode);

  const [form, setForm] = useState({
    type: (editing?.type || defaultType) as "income" | "expense",
    patient_id: editing?.patient_id || lockedPatient?.id || "",
    category: editing?.category || "Consulta psicológica",
    amount: editing ? String(editing.amount) : "",
    description: editing?.description || "",
    due_date: editing?.due_date || format(new Date(), "yyyy-MM-dd"),
    payment_method: editing?.payment_method || "pix",
    status: (editing?.status === "paid" ? "paid" : "pending") as "pending" | "paid",
  });

  // Recurring-plan-specific fields
  const [planForm, setPlanForm] = useState({
    billing_type: "monthly" as ActivePlan["billing_type"],
    sessions_per_cycle: 4,
    day_of_month: 5,
    start_date: format(new Date(), "yyyy-MM-dd"),
  });

  // hydrate form when editing target changes
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMode("single");
      setForm({
        type: editing.type,
        patient_id: editing.patient_id || "",
        category: editing.category,
        amount: String(editing.amount),
        description: editing.description,
        due_date: editing.due_date,
        payment_method: editing.payment_method || "pix",
        status: editing.status === "paid" ? "paid" : "pending",
      });
    } else {
      setMode(defaultMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // bootstrap user + patient list
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      if (!lockedPatient) {
        const { data } = await supabase.from("patients")
          .select("id, full_name, default_session_value, monthly_plan_value, payment_day")
          .eq("psychologist_id", user.id)
          .eq("status", "active")
          .is("deleted_at", null)
          .order("full_name");
        if (data) setPatients(data as any);
      } else {
        setPatients([lockedPatient]);
      }
    })();
  }, [open, lockedPatient]);

  // when patient changes → load active plan + next pending installment + autofill
  useEffect(() => {
    if (!form.patient_id) { setActivePlan(null); setNextPending(null); return; }
    (async () => {
      const { data } = await supabase
        .from("patient_billing_plans" as any)
        .select("id, billing_type, amount, day_of_month, start_date, description")
        .eq("patient_id", form.patient_id)
        .eq("active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const plan = (data ? (data as unknown as ActivePlan) : null);
      setActivePlan(plan);

      // Lookup next pending installment tied to this plan (or patient)
      let pending: NextPendingInstallment | null = null;
      let q: any = supabase
        .from("financial_transactions")
        .select("id, amount, due_date, description, payment_method, status")
        .eq("patient_id", form.patient_id)
        .eq("type", "income")
        .eq("status", "pending")
        .is("deleted_at", null);
      if (plan) q = q.eq("billing_plan_id", plan.id);
      const { data: pendData } = await q.order("due_date", { ascending: true }).limit(1);
      if (pendData && pendData[0]) pending = pendData[0] as NextPendingInstallment;
      setNextPending(pending);

      if (isEdit) return;

      const patient =
        lockedPatient && lockedPatient.id === form.patient_id
          ? lockedPatient
          : patients.find(p => p.id === form.patient_id);
      if (!patient) return;

      let amount = form.amount;
      let due_date = form.due_date;
      let category = form.category;
      let description = form.description;

      if (pending) {
        // Priority: settle the next pending installment first
        amount = String(pending.amount);
        due_date = pending.due_date;
        description = pending.description || suggestDescription(patient.full_name, plan?.billing_type);
        category = plan?.billing_type === "monthly" ? "Pacote mensal" : "Consulta psicológica";
      } else if (plan) {
        amount = String(plan.amount);
        due_date = smartDueDateFromPlan(plan);
        category = plan.billing_type === "monthly" ? "Pacote mensal" : "Consulta psicológica";
        description = suggestDescription(patient.full_name, plan.billing_type, category);
        setPlanForm(pf => ({
          ...pf,
          billing_type: plan.billing_type,
          day_of_month: plan.day_of_month || pf.day_of_month,
        }));
      } else if (patient.default_session_value) {
        amount = String(patient.default_session_value);
        if (patient.payment_day) due_date = smartDueDateFromDay(patient.payment_day);
        description = suggestDescription(patient.full_name, undefined, category);
      } else if (patient.monthly_plan_value) {
        amount = String(patient.monthly_plan_value);
        category = "Pacote mensal";
        description = suggestDescription(patient.full_name, undefined, category);
      } else {
        description = suggestDescription(patient.full_name, undefined, category);
      }

      setForm(f => ({ ...f, amount, due_date, category, description }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.patient_id]);

  const selectedPatient = useMemo(
    () => (lockedPatient && lockedPatient.id === form.patient_id)
      ? lockedPatient
      : patients.find(p => p.id === form.patient_id) || null,
    [patients, form.patient_id, lockedPatient]
  );

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ====== RECURRING MODE → create billing plan ======
    if (mode === "recurring" && !isEdit) {
      if (!form.patient_id) { toast.error("Selecione um paciente"); return; }
      if (!form.amount) { toast.error("Informe o valor"); return; }
      setSaving(true);
      const { error } = await supabase.from("patient_billing_plans" as any).insert({
        psychologist_id: userId,
        patient_id: form.patient_id,
        billing_type: planForm.billing_type,
        amount: parseFloat(form.amount),
        sessions_per_cycle: planForm.billing_type === "monthly" ? Number(planForm.sessions_per_cycle) || null : null,
        day_of_month: planForm.billing_type === "monthly" ? Number(planForm.day_of_month) : null,
        // start_date is NOT NULL in DB — always send a value
        start_date: planForm.start_date || format(new Date(), "yyyy-MM-dd"),
        description: form.description || null,
        active: true,
      });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Plano de cobrança criado");
      onOpenChange(false);
      onCreated?.();
      return;
    }

    // ====== SINGLE MODE → financial_transactions ======
    if (!form.amount || !form.due_date) {
      toast.error("Preencha valor e vencimento");
      return;
    }
    setSaving(true);
    const basePayload: any = {
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || "Transação",
      category: form.category,
      payment_method: form.payment_method,
      status: form.status,
      due_date: form.due_date,
      patient_id: form.patient_id || null,
    };

    if (isEdit && editing) {
      const updateData = { ...basePayload };
      if (form.status === "paid" && editing.status !== "paid") {
        updateData.paid_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("financial_transactions").update(updateData).eq("id", editing.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação atualizada");
    } else {
      // If there's a pending installment matching this entry, SETTLE it instead of creating a duplicate
      const settling = !!(nextPending && form.type === "income" && form.status === "paid"
        && Math.abs(Number(form.amount) - Number(nextPending.amount)) < 0.01);

      if (settling && nextPending) {
        const { error } = await supabase.from("financial_transactions").update({
          status: "paid",
          paid_date: new Date().toISOString().slice(0, 10),
          payment_method: form.payment_method,
          description: form.description || nextPending.description,
        } as any).eq("id", nextPending.id);
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Parcela conciliada e marcada como paga");
      } else {
        const payload: any = { ...basePayload, psychologist_id: userId };
        if (form.status === "paid") payload.paid_date = new Date().toISOString().slice(0, 10);
        if (activePlan && form.type === "income") payload.billing_plan_id = activePlan.id;
        const { error } = await supabase.from("financial_transactions").insert(payload);
        setSaving(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Transação registrada");
      }
    }

    onOpenChange(false);
    onCreated?.();
    if (!isEdit) setForm(f => ({ ...f, amount: "", description: "" }));
  };

  const isRecurring = mode === "recurring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[calc(100vw-1rem)] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            {isEdit
              ? "Editar Transação"
              : isRecurring
                ? "Novo Plano de Cobrança"
                : (lockedPatient ? "Registrar Pagamento" : "Nova Transação")}
          </DialogTitle>
        </DialogHeader>

        {/* MODE TOGGLE — unifies "Nova Cobrança" / "Nova Transação" / "Novo Plano" */}
        {!isEdit && !lockMode && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Repeat className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold">Cobrança recorrente</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {isRecurring ? "Cria um plano que gera cobranças automáticas" : "Lançamento único de receita/despesa"}
                </div>
              </div>
            </div>
            <Switch checked={isRecurring} onCheckedChange={(v) => setMode(v ? "recurring" : "single")} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* DADOS PRINCIPAIS */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Principais</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {!isRecurring && (
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v: "income" | "expense") => setForm({ ...form, type: v, category: "" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={`space-y-1.5 ${isRecurring ? "sm:col-span-2" : ""}`}>
                <Label>Paciente {isRecurring && <span className="text-destructive">*</span>}</Label>
                {lockedPatient ? (
                  <div className="h-10 px-3 rounded-md border bg-muted/30 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{lockedPatient.full_name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Contexto automático</Badge>
                  </div>
                ) : (
                  <PatientCombobox
                    patients={patients}
                    value={form.patient_id}
                    onChange={(v) => setForm({ ...form, patient_id: v })}
                    placeholder={isRecurring ? "Selecione o paciente" : "Opcional"}
                  />
                )}
              </div>
            </div>

            {/* RECURRING: billing type + amount */}
            {isRecurring ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label>Frequência</Label>
                    <Select
                      value={planForm.billing_type}
                      onValueChange={(v: ActivePlan["billing_type"]) => setPlanForm({ ...planForm, billing_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_session">Por sessão</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number" step="0.01" placeholder="0.00" required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md border bg-primary/5 p-2.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>{RECURRING_HELP[planForm.billing_type]}</span>
                </div>

                {planForm.billing_type === "monthly" && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label>Sessões/mês</Label>
                      <Input
                        type="number" min={1}
                        value={planForm.sessions_per_cycle}
                        onChange={(e) => setPlanForm({ ...planForm, sessions_per_cycle: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Dia do vencimento</Label>
                      <Input
                        type="number" min={1} max={31}
                        value={planForm.day_of_month}
                        onChange={(e) => setPlanForm({ ...planForm, day_of_month: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                {(planForm.billing_type === "weekly" || planForm.billing_type === "biweekly") && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" />Data da 1ª cobrança</Label>
                    <Input
                      type="date"
                      value={planForm.start_date}
                      onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Próximas cobranças geradas a cada {planForm.billing_type === "weekly" ? "7" : "15"} dias.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <div className="relative">
                    <Input
                      type="number" step="0.01" placeholder="0.00" required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                    {selectedPatient && form.amount && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        auto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Smart context banner */}
            <AnimatePresence>
              {selectedPatient && (activePlan || selectedPatient.default_session_value || selectedPatient.payment_day) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border bg-primary/5 p-3 flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    {activePlan ? <Repeat className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{selectedPatient.full_name}</span>
                      {activePlan && (
                        <Badge variant="secondary" className="text-[10px]">
                          Plano: {PLAN_LABEL[activePlan.billing_type]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground break-words">
                      {activePlan
                        ? `Cobrança ${PLAN_LABEL[activePlan.billing_type].toLowerCase()} · R$ ${Number(activePlan.amount).toFixed(2)}${activePlan.day_of_month ? ` · dia ${activePlan.day_of_month}` : ""}`
                        : <>
                            {selectedPatient.default_session_value && <>Sessão padrão R$ {selectedPatient.default_session_value}</>}
                            {selectedPatient.payment_day && <> · Pgto dia {selectedPatient.payment_day}</>}
                          </>}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label>Descrição {isRecurring && <span className="text-muted-foreground text-xs">(opcional)</span>}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={isRecurring ? "Ex.: Plano semanal de psicoterapia" : "Sessão de psicoterapia"}
                required={!isRecurring}
              />
            </div>
          </div>

          {!isRecurring && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label>Forma de Pagamento</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão Débito</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="bank_transfer">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v: "pending" | "paid") => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" />Vencimento</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Salvando..." : isRecurring ? "Criar plano" : (isEdit ? "Salvar alterações" : "Registrar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
