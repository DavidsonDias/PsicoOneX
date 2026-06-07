import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Calendar, Repeat, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useConsistencyCheck } from "@/hooks/useConsistencyCheck";
import { ConsistencyDialog } from "@/components/shared/ConsistencyDialog";

type Plan = {
  id: string;
  patient_id: string;
  billing_type: "per_session" | "weekly" | "biweekly" | "monthly";
  amount: number;
  sessions_per_cycle: number | null;
  day_of_month: number | null;
  active: boolean;
  description: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  per_session: "Por sessão",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function BillingPlansPanel({ patients }: { patients: { id: string; full_name: string }[] }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    patient_id: "",
    billing_type: "monthly",
    amount: "",
    sessions_per_cycle: 4,
    session_value: "",
    day_of_month: 5,
    description: "",
  });
  const { issues, check, clear } = useConsistencyCheck();
  const [showIssues, setShowIssues] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("patient_billing_plans" as any)
      .select("*")
      .is("deleted_at", null)
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

  const submit = async (force = false) => {
    if (!form.patient_id || !form.amount) {
      toast.error("Preencha paciente e valor");
      return;
    }
    if (!force) {
      const found = await check("billing_plan", {
        billing_type: form.billing_type,
        amount: Number(form.amount),
        session_value: Number(form.session_value || 0),
        sessions_per_cycle: Number(form.sessions_per_cycle || 0),
      });
      if (found.length) {
        setShowIssues(true);
        return;
      }
    }
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase.from("patient_billing_plans" as any).insert({
      psychologist_id: session.session!.user.id,
      patient_id: form.patient_id,
      billing_type: form.billing_type,
      amount: Number(form.amount),
      sessions_per_cycle: Number(form.sessions_per_cycle) || null,
      day_of_month: form.billing_type === "monthly" ? Number(form.day_of_month) : null,
      description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Plano de cobrança criado");
    setOpen(false);
    setShowIssues(false);
    clear();
    load();
  };

  const applyFix = (issue: any) => {
    if (issue.field === "amount" && issue.suggested_value) {
      setForm((f: any) => ({ ...f, amount: String(issue.suggested_value) }));
      setShowIssues(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("patient_billing_plans" as any).update({ deleted_at: new Date().toISOString(), active: false }).eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat className="h-4 w-4 text-primary" /> Planos de Cobrança
          </CardTitle>
          <CardDescription>
            Cobrança recorrente por paciente (separado da agenda).
            <span className="ml-2 font-medium text-foreground">
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
            return (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{patient?.full_name || "Paciente"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{TYPE_LABEL[p.billing_type]}</Badge>
                    <span>R$ {Number(p.amount).toFixed(2)}</span>
                    {p.day_of_month && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />dia {p.day_of_month}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)} aria-label="Remover plano">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />Novo plano de cobrança
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Paciente</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.billing_type} onValueChange={(v) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_session">Por sessão</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            {form.billing_type === "monthly" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Sessões/mês</Label>
                  <Input type="number" value={form.sessions_per_cycle} onChange={(e) => setForm({ ...form, sessions_per_cycle: e.target.value })} />
                </div>
                <div>
                  <Label>Valor sessão</Label>
                  <Input type="number" step="0.01" value={form.session_value} onChange={(e) => setForm({ ...form, session_value: e.target.value })} />
                </div>
                <div>
                  <Label>Dia venc.</Label>
                  <Input type="number" min={1} max={31} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
                </div>
              </div>
            )}
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => submit(false)}>Validar e salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsistencyDialog
        open={showIssues}
        onOpenChange={setShowIssues}
        issues={issues}
        onConfirm={() => submit(true)}
        onApplyFix={applyFix}
        confirmLabel="Salvar mesmo assim"
      />
    </Card>
  );
}
