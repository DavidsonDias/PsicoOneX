import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  type: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_status: string;
  patient_id: string | null;
}

interface FinancialGrowthProps {
  transactions: Transaction[];
}

export function FinancialGrowth({ transactions }: FinancialGrowthProps) {
  const growthData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const monthTxs = transactions.filter(t => {
        const td = new Date(t.due_date);
        return td >= ms && td <= me;
      });

      const income = monthTxs
        .filter(t => t.type === "income" && t.payment_status === "paid")
        .reduce((s, t) => s + Number(t.amount), 0);
      const overdue = monthTxs
        .filter(t => t.type === "income" && (t.payment_status === "overdue" || (t.payment_status === "pending" && new Date(t.due_date) < new Date())))
        .reduce((s, t) => s + Number(t.amount), 0);
      const patients = new Set(
        monthTxs.filter(t => t.type === "income" && t.patient_id).map(t => t.patient_id)
      ).size;

      months.push({
        month: format(d, "MMM", { locale: ptBR }),
        receita: income,
        inadimplencia: overdue,
        pacientes: patients,
      });
    }
    return months;
  }, [transactions]);

  const currentMonth = growthData[growthData.length - 1];
  const lastMonth = growthData[growthData.length - 2];
  const growthPercent = lastMonth?.receita > 0
    ? Math.round(((currentMonth.receita - lastMonth.receita) / lastMonth.receita) * 100)
    : 0;

  const totalDelinquency = transactions
    .filter(t => t.type === "income" && t.payment_status !== "paid" && t.due_date && new Date(t.due_date) < new Date())
    .reduce((s, t) => s + Number(t.amount), 0);

  const avgRevenue = growthData.reduce((s, m) => s + m.receita, 0) / Math.max(growthData.filter(m => m.receita > 0).length, 1);
  const projectedAnnual = avgRevenue * 12;

  return (
    <div className="space-y-4">
      {/* Growth summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {growthPercent >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Crescimento</span>
            </div>
            <p className={`text-lg font-bold ${growthPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {growthPercent > 0 ? '+' : ''}{growthPercent}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Inadimplência</span>
            </div>
            <p className="text-lg font-bold text-amber-500">
              R$ {totalDelinquency.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Projeção Anual</span>
            </div>
            <p className="text-lg font-bold">
              R$ {projectedAnnual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Pacientes/mês</span>
            </div>
            <p className="text-lg font-bold">{currentMonth.pacientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Evolução de Receita (12 meses)
            </CardTitle>
            <Badge variant={growthPercent >= 0 ? "default" : "destructive"} className="text-xs">
              {growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`} vs mês anterior
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Area type="monotone" dataKey="receita" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="Receita" />
                <Area type="monotone" dataKey="inadimplencia" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={1.5} name="Inadimplência" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
