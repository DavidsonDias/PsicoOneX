import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  category: string | null;
  status: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
}

interface Props {
  patientId: string;
  patientName: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX", credit_card: "Cartão Crédito", debit_card: "Cartão Débito",
  cash: "Dinheiro", bank_transfer: "Transferência", convenio: "Convênio", link: "Link",
};

export function PatientFinancialTab({ patientId, patientName }: Props) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [patientId]);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("id, type, amount, description, category, status, due_date, paid_date, payment_method")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("due_date", { ascending: false });

    if (error) { toast.error("Erro ao carregar financeiro"); return; }
    setTransactions(data || []);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const paid = transactions.filter(t => t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const pending = transactions.filter(t => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
    const overdue = transactions
      .filter(t => t.status === "pending" && t.due_date && isAfter(now, new Date(t.due_date)))
      .reduce((s, t) => s + Number(t.amount), 0);
    return { paid, pending, overdue, total: transactions.length };
  }, [transactions]);

  const getEffectiveStatus = (t: Transaction) => {
    if (t.status === "pending" && t.due_date && isAfter(new Date(), new Date(t.due_date))) return "overdue";
    return t.status || "pending";
  };

  const handleMarkPaid = async (txId: string) => {
    const { error } = await supabase
      .from("financial_transactions")
      .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
      .eq("id", txId);
    if (error) { toast.error("Erro ao registrar pagamento"); return; }
    toast.success("Pagamento registrado!");
    loadTransactions();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="text-lg font-bold text-green-600">R$ {metrics.paid.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-bold text-amber-600">R$ {metrics.pending.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atrasado</p>
              <p className="text-lg font-bold text-destructive">R$ {metrics.overdue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma transação registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const effectiveStatus = getEffectiveStatus(tx);
            const statusInfo = STATUS_MAP[effectiveStatus] || STATUS_MAP.pending;
            return (
              <Card key={tx.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{tx.description || tx.category || "Transação"}</p>
                      <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {tx.due_date && <span>Venc: {format(new Date(tx.due_date + "T00:00:00"), "dd/MM/yyyy")}</span>}
                      {tx.paid_date && <span>Pago: {format(new Date(tx.paid_date + "T00:00:00"), "dd/MM/yyyy")}</span>}
                      {tx.payment_method && <span>{PAYMENT_LABELS[tx.payment_method] || tx.payment_method}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${tx.type === "income" ? "text-green-600" : "text-destructive"}`}>
                      R$ {Number(tx.amount).toFixed(2)}
                    </span>
                    {effectiveStatus !== "paid" && effectiveStatus !== "cancelled" && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => handleMarkPaid(tx.id)}>
                        Registrar Pgto
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{metrics.total} transação(ões)</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/financeiro")}>
          Ver Financeiro Completo
        </Button>
      </div>
    </div>
  );
}
