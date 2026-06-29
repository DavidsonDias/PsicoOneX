import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar, Repeat, Trash2, Zap, User, Loader2 } from "lucide-react";
import { SmartTransactionDialog } from "@/components/financial/SmartTransactionDialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type Plan = {
  id: string;
  psychologist_id: string;
  patient_id: string;
  billing_type: "per_session" | "weekly" | "biweekly" | "monthly";
  amount: number;
  sessions_per_cycle: number | null;
  day_of_month: number | null;
  active: boolean;
  description: string | null;
  last_generated_at: string | null;
  start_date: string | null;
  payment_method: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  per_session: "Por sessão",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const TYPE_TONE: Record<string, string> = {
  per_session: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  weekly: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  biweekly: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  monthly: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

function nextDueDate(plan: Plan): Date {
  const today = new Date();
  if (plan.billing_type === "monthly" && plan.day_of_month) {
    const y = today.getFullYear(), m = today.getMonth();
    const candidate = new Date(y, m, plan.day_of_month);
    if (candidate < today) return new Date(y, m + 1, plan.day_of_month);
    return candidate;
  }
  if (plan.billing_type === "weekly") {
    const base = plan.last_generated_at ? new Date(plan.last_generated_at) : today;
    return addDays(base, 7);
  }
  if (plan.billing_type === "biweekly") {
    const base = plan.last_generated_at ? new Date(plan.last_generated_at) : today;
    return addDays(base, 15);
  }
  return today;
}

export function BillingPlansPanel({
  patients,
  onChanged,
}: {
  patients: { id: string; full_name: string }[];
  onChanged?: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("patient_billing_plans" as any)
      .select("*")
      .is("deleted_at", null)
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    setPlans((data as any) || []);
  };

  useEffect(() => { load(); }, []);

  const monthlyForecast = plans
    .filter((p) => p.active)
    .reduce((s, p) => {
      const multiplier = p.billing_type === "weekly" ? 4 : p.billing_type === "biweekly" ? 2 : 1;
      return s + Number(p.amount) * multiplier;
    }, 0);

  const togglePlan = async (plan: Plan) => {
    const { error } = await supabase
      .from("patient_billing_plans" as any)
      .update({ active: !plan.active })
      .eq("id", plan.id);
    if (error) { toast.error(error.message); return; }
    toast.success(plan.active ? "Plano pausado" : "Plano ativado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este plano de cobrança?")) return;
    await supabase
      .from("patient_billing_plans" as any)
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq("id", id);
    toast.success("Plano excluído");
    load();
    onChanged?.();
  };

  const generateNow = async (plan: Plan) => {
    setGeneratingId(plan.id);
    try {
      const patient = patients.find((x) => x.id === plan.patient_id);
      const due = nextDueDate(plan);
      const dueStr = format(due, "yyyy-MM-dd");
      const desc =
        plan.description ||
        `Cobrança ${TYPE_LABEL[plan.billing_type].toLowerCase()} — ${patient?.full_name || "Paciente"}`;

      const { error } = await supabase.from("financial_transactions").insert({
        psychologist_id: plan.psychologist_id as any,
        patient_id: plan.patient_id,
        type: "income",
        status: "pending",
        amount: Number(plan.amount),
        due_date: dueStr,
        description: desc,
        payment_method: plan.payment_method || "pix",
        category: plan.billing_type === "monthly" ? "Pacote mensal" : "Consulta psicológica",
      } as any);
      if (error) throw error;

      await supabase
        .from("patient_billing_plans" as any)
        .update({ last_generated_at: new Date().toISOString() })
        .eq("id", plan.id);

      toast.success(`Cobrança gerada para ${format(due, "dd/MM/yyyy")}`);
      load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar cobrança");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat className="h-4 w-4 text-primary" /> Planos de Cobrança
          </CardTitle>
          <CardDescription>
            Cobrança recorrente por paciente.{" "}
            <span className="font-medium text-foreground">
              Receita mensal prevista: R$ {monthlyForecast.toFixed(2)}
            </span>
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo plano
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum plano configurado</p>
        ) : (
          plans.map((p) => {
            const patient = patients.find((x) => x.id === p.patient_id);
            const due = nextDueDate(p);
            const isGen = generatingId === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3 sm:p-4 transition-colors ${
                  p.active ? "bg-card hover:border-primary/40" : "bg-muted/30 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {patient?.full_name || "Paciente"}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${TYPE_TONE[p.billing_type]}`}>
                          {TYPE_LABEL[p.billing_type]}
                        </Badge>
                        {!p.active && (
                          <Badge variant="secondary" className="text-[10px]">Pausado</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">
                          R$ {Number(p.amount).toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Próx. {format(due, "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        {p.last_generated_at && (
                          <span className="text-[11px]">
                            Última: {format(new Date(p.last_generated_at), "dd/MM")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={p.active}
                    onCheckedChange={() => togglePlan(p)}
                    aria-label={p.active ? "Pausar plano" : "Ativar plano"}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => generateNow(p)}
                    disabled={!p.active || isGen}
                  >
                    {isGen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Gerar cobrança agora
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove(p.id)}
                    aria-label="Excluir plano"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Unified launcher: reuses the same SmartTransactionDialog in recurring mode */}
      <SmartTransactionDialog
        open={open}
        onOpenChange={setOpen}
        defaultMode="recurring"
        lockMode
        onCreated={() => {
          load();
          onChanged?.();
        }}
      />
    </Card>
  );
}
