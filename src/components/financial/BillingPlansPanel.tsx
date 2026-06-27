import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Repeat, Trash2 } from "lucide-react";
import { SmartTransactionDialog } from "@/components/financial/SmartTransactionDialog";

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
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
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

      {/* Unified launcher: reuses the same SmartTransactionDialog in recurring mode */}
      <SmartTransactionDialog
        open={open}
        onOpenChange={setOpen}
        defaultMode="recurring"
        lockMode
        onCreated={load}
      />
    </Card>
  );
}
