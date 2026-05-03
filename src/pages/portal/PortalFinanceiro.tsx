import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientPortalAuth } from "@/contexts/PatientPortalAuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS: Record<string, { label: string; icon: any; color: string }> = {
  paid: { label: "Pago", icon: CheckCircle2, color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  overdue: { label: "Atrasado", icon: AlertCircle, color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  cancelled: { label: "Cancelado", icon: AlertCircle, color: "bg-muted text-muted-foreground" },
};

export default function PortalFinanceiro() {
  const { patient } = usePatientPortalAuth();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<any[]>([]);

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("id, amount, status, due_date, paid_date, description, type, created_at")
        .eq("patient_id", patient.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      setTx(data || []);
      setLoading(false);
    })();
  }, [patient]);

  const totalPending = tx.filter(t => ["pending", "overdue"].includes(t.status)).reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = tx.filter(t => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas cobranças e pagamentos</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pendente</div>
          <div className="text-2xl font-bold text-amber-500">
            R$ {totalPending.toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pago no total</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            R$ {totalPaid.toFixed(2)}
          </div>
        </Card>
      </div>

      <div className="space-y-2">
        {tx.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Nenhuma cobrança registrada
          </Card>
        ) : tx.map(t => {
          const s = STATUS[t.status] || STATUS.pending;
          const Icon = s.icon;
          return (
            <Card key={t.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{t.description || "Sessão"}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.due_date ? `Vence ${format(new Date(t.due_date), "dd/MM/yyyy", { locale: ptBR })}` : ""}
                    {t.paid_date ? ` · Pago ${format(new Date(t.paid_date), "dd/MM/yyyy", { locale: ptBR })}` : ""}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">R$ {Number(t.amount).toFixed(2)}</div>
                <Badge className={`${s.color} border-0 text-[10px]`}>{s.label}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
