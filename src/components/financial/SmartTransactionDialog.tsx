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
import { PatientCombobox } from "@/components/shared/PatientCombobox";
import { Sparkles, Repeat, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

/**
 * SmartTransactionDialog
 * -----------------------
 * Unified transaction creator used in:
 *  - Financeiro main page ("Nova Transação")
 *  - PatientProfile → Financeiro tab ("Registrar Pagamento")
 *  - (future) AgendaForm quick-pay
 *
 * Intelligence:
 *  - Reads patient cadastro: default_session_value, monthly_plan_value, payment_day
 *  - Reads active patient_billing_plans → infers frequency (weekly/biweekly/monthly/per_session)
 *  - Auto-fills amount, description and due_date based on plan rules
 *  - Locks patient when used from a patient profile (contexto automático)
 */

interface PatientLite {
  id: string;
  full_name: string;
  default_session_value?: number | null;
  monthly_plan_value?: number | null;
  payment_day?: number | null;
}

interface ActivePlan {
  billing_type: "per_session" | "weekly" | "biweekly" | "monthly";
  amount: number;
  day_of_month: number | null;
  start_date: string | null;
  description: string | null;
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
  lockedPatient?: PatientLite | null; // when set: patient field is read-only
  onCreated?: () => void;
  defaultType?: "income" | "expense";
  editing?: EditingTransaction | null;
}

const INCOME_CATEGORIES = [
  "Consulta psicológica", "Pacote mensal", "Avaliação / Laudo",
  "Atendimento online", "Atendimento presencial", "Supervisão", "Workshop", "Outros",
];
const EXPENSE_CATEGORIES = [
  "Ferramentas / Software", "Marketing", "Operacional",
  "Aluguel consultório", "Impostos", "Equipamentos", "Outros",
];

function smartDueDateFromDay(day: number): string {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const target = day < d
    ? new Date(y, m + 1, day)
    : new Date(y, m, day);
  return format(target, "yyyy-MM-dd");
}

function smartDueDateFromPlan(plan: ActivePlan): string {
  if (plan.billing_type === "monthly" && plan.day_of_month) {
    return smartDueDateFromDay(plan.day_of_month);
  }
  if (plan.billing_type === "weekly") {
    return format(addDays(new Date(), 7), "yyyy-MM-dd");
  }
  if (plan.billing_type === "biweekly") {
    return format(addDays(new Date(), 15), "yyyy-MM-dd");
  }
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
  open, onOpenChange, lockedPatient = null, onCreated, defaultType = "income", editing = null,
}: Props) {
  const isEdit = !!editing;
  const [userId, setUserId] = useState<string>("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [saving, setSaving] = useState(false);

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

  // hydrate form when editing target changes / dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
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

  // when patient changes → load active plan + autofill
  useEffect(() => {
    if (!form.patient_id) { setActivePlan(null); return; }
    (async () => {
      const { data } = await supabase
        .from("patient_billing_plans" as any)
        .select("billing_type, amount, day_of_month, start_date, description")
        .eq("patient_id", form.patient_id)
        .eq("active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const plan = (data ? (data as unknown as ActivePlan) : null);
      setActivePlan(plan);

      // In edit mode, only surface the plan (banner) — don't overwrite user values
      if (isEdit) return;

      const patient =
        lockedPatient && lockedPatient.id === form.patient_id
          ? lockedPatient
          : patients.find(p => p.id === form.patient_id);
      if (!patient) return;

      let amount = form.amount;
      let due_date = form.due_date;
      let category = form.category;

      if (plan) {
        amount = String(plan.amount);
        due_date = smartDueDateFromPlan(plan);
        category = plan.billing_type === "monthly" ? "Pacote mensal" : "Consulta psicológica";
      } else if (patient.default_session_value) {
        amount = String(patient.default_session_value);
        if (patient.payment_day) due_date = smartDueDateFromDay(patient.payment_day);
      } else if (patient.monthly_plan_value) {
        amount = String(patient.monthly_plan_value);
        category = "Pacote mensal";
      }

      setForm(f => ({
        ...f,
        amount,
        due_date,
        category,
        description: suggestDescription(patient.full_name, plan?.billing_type, category),
      }));
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
      const { error } = await supabase
        .from("financial_transactions")
        .update(updateData)
        .eq("id", editing.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação atualizada");
    } else {
      const payload: any = { ...basePayload, psychologist_id: userId };
      if (form.status === "paid") payload.paid_date = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("financial_transactions").insert(payload);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Transação registrada");
    }

    onOpenChange(false);
    onCreated?.();
    if (!isEdit) setForm(f => ({ ...f, amount: "", description: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {lockedPatient ? "Registrar Pagamento" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* DADOS PRINCIPAIS */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Principais</h4>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-1.5">
                <Label>Paciente</Label>
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
                    placeholder="Opcional"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-muted-foreground">
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
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Sessão de psicoterapia"
                required
              />
            </div>
          </div>

          <Separator />

          {/* PAGAMENTO */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</h4>
            <div className="grid grid-cols-2 gap-4">
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
