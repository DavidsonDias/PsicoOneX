import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Search, Filter, Target, Sparkles, PieChart, Receipt, AlertTriangle, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { StatsOverview } from "@/components/ui/stats-overview";
import { FinancialChart } from "@/components/financial/FinancialChart";
import { FinancialProjections } from "@/components/financial/FinancialProjections";
import { CategoryAnalysis } from "@/components/financial/CategoryAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  payment_status: string;
  due_date: string;
  paid_date: string | null;
  patient_id: string | null;
  patient_name?: string;
  created_at: string;
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    type: "income", amount: "", description: "", category: "",
    payment_method: "", payment_status: "pending", due_date: "", patient_id: ""
  });

  useEffect(() => { checkAuthAndLoadData(); }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([loadTransactions(), loadPatients()]);
    setLoading(false);
  };

  const loadTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("financial_transactions")
      .select(`*, patients (full_name)`)
      .eq("psychologist_id", user.id)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Erro ao carregar transações"); return; }

    const formatted = (data || []).map((t: any) => ({
      ...t, patient_name: t.patients?.full_name, payment_status: t.status
    }));
    setTransactions(formatted);
  };

  const loadPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("patients").select("id, full_name").eq("psychologist_id", user.id).eq("status", "active").order("full_name");
    if (data) setPatients(data);
  };

  // Enhanced financial metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.due_date);
      return d >= startOfMonth(now) && d <= endOfMonth(now);
    });
    const lastMonth = transactions.filter(t => {
      const d = new Date(t.due_date);
      const lm = subMonths(now, 1);
      return d >= startOfMonth(lm) && d <= endOfMonth(lm);
    });

    const income = thisMonth.filter(t => t.type === "income" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const expense = thisMonth.filter(t => t.type === "expense" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const pending = thisMonth.filter(t => t.payment_status === "pending").reduce((s, t) => s + Number(t.amount), 0);
    const overdue = transactions.filter(t => t.payment_status === "pending" && isAfter(now, new Date(t.due_date))).reduce((s, t) => s + Number(t.amount), 0);
    
    const lastIncome = lastMonth.filter(t => t.type === "income" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const incomeChange = lastIncome > 0 ? Math.round(((income - lastIncome) / lastIncome) * 100) : 0;

    // Unique paying patients this month
    const uniquePatients = new Set(thisMonth.filter(t => t.type === "income" && t.payment_status === "paid" && t.patient_id).map(t => t.patient_id));
    const ticketMedio = uniquePatients.size > 0 ? income / uniquePatients.size : 0;

    // MRR (recurring income from consultations)
    const mrrPatients = new Set(thisMonth.filter(t => t.type === "income" && t.category === "Consulta" && t.patient_id).map(t => t.patient_id));
    const mrr = income; // Simplified: all income this month

    // Delinquency rate
    const totalReceivable = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const delinquencyRate = totalReceivable > 0 ? Math.round((overdue / totalReceivable) * 100) : 0;

    // Category breakdown for real data
    const categoryMap: Record<string, number> = {};
    const expenseCategoryMap: Record<string, number> = {};
    thisMonth.forEach(t => {
      const cat = t.category || "Outros";
      if (t.type === "income") categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
      else expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + Number(t.amount);
    });

    return {
      income, expense, pending, overdue, incomeChange, ticketMedio, mrr,
      delinquencyRate, balance: income - expense, uniquePatients: uniquePatients.size,
      categoryMap, expenseCategoryMap, totalReceivable,
    };
  }, [transactions]);

  // Monthly chart data from real transactions
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const monthTxs = transactions.filter(t => {
        const td = new Date(t.due_date);
        return td >= ms && td <= me;
      });
      months.push({
        month: format(d, "MMM", { locale: ptBR }),
        receita: monthTxs.filter(t => t.type === "income" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0),
        despesa: monthTxs.filter(t => t.type === "expense" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return months;
  }, [transactions]);

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const txData: any = {
      psychologist_id: user.id, type: fd.get("type"), amount: parseFloat(fd.get("amount") as string),
      description: fd.get("description"), category: fd.get("category"), payment_method: fd.get("payment_method"),
      status: fd.get("payment_status"), due_date: fd.get("due_date"),
    };
    const pid = fd.get("patient_id");
    if (pid) txData.patient_id = pid;

    const { error } = await supabase.from("financial_transactions").insert(txData);
    if (error) { toast.error("Erro ao criar transação"); return; }

    // Audit log
    await supabase.from("audit_logs").insert({ user_id: user.id, action: "create", entity_type: "transaction", details: { type: txData.type, amount: txData.amount } });

    toast.success("Transação criada!");
    setDialogOpen(false);
    loadTransactions();
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const { error } = await supabase.from("financial_transactions").update({
      type: formData.type, amount: parseFloat(formData.amount), description: formData.description,
      category: formData.category, payment_method: formData.payment_method, status: formData.payment_status,
      due_date: formData.due_date, patient_id: formData.patient_id || null
    }).eq("id", editingTransaction.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Transação atualizada!");
    setEditingTransaction(null);
    resetForm();
    loadTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Transação excluída!");
    loadTransactions();
  };

  const openEditDialog = (t: Transaction) => {
    setFormData({ type: t.type, amount: t.amount.toString(), description: t.description, category: t.category, payment_method: t.payment_method, payment_status: t.payment_status, due_date: t.due_date, patient_id: t.patient_id || "" });
    setEditingTransaction(t);
  };

  const resetForm = () => setFormData({ type: "income", amount: "", description: "", category: "", payment_method: "", payment_status: "pending", due_date: "", patient_id: "" });

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.payment_status !== filterStatus) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const v: Record<string, "default" | "secondary" | "destructive" | "outline"> = { paid: "default", pending: "secondary", overdue: "destructive", cancelled: "outline" };
    const l: Record<string, string> = { paid: "Pago", pending: "Pendente", overdue: "Atrasado", cancelled: "Cancelado" };
    return <Badge variant={v[status] || "secondary"}>{l[status] || status}</Badge>;
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-12"><div className="animate-pulse text-primary">Carregando...</div></div></AppLayout>;

  const incomeCategories = Object.entries(metrics.categoryMap).map(([name, value], i) => {
    const total = Object.values(metrics.categoryMap).reduce((s, v) => s + v, 0) || 1;
    const colors = ["hsl(142, 76%, 36%)", "hsl(217, 91%, 60%)", "hsl(262, 83%, 58%)", "hsl(45, 93%, 47%)"];
    return { name, value, percentage: Math.round((value / total) * 100), trend: "stable" as const, color: colors[i % colors.length] };
  });

  const expenseCategories = Object.entries(metrics.expenseCategoryMap).map(([name, value], i) => {
    const total = Object.values(metrics.expenseCategoryMap).reduce((s, v) => s + v, 0) || 1;
    const colors = ["hsl(0, 84%, 60%)", "hsl(45, 93%, 47%)", "hsl(262, 83%, 58%)", "hsl(var(--muted-foreground))"];
    return { name, value, percentage: Math.round((value / total) * 100), trend: "stable" as const, color: colors[i % colors.length] };
  });

  return (
    <AppLayout title="PsicoBank Enterprise" description="Gestão financeira completa com insights e automações">
      <StatsOverview
        stats={[
          { label: "Receitas", value: `R$ ${metrics.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "green", change: metrics.incomeChange },
          { label: "Despesas", value: `R$ ${metrics.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: "red" },
          { label: "Saldo Líquido", value: `R$ ${metrics.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "blue" },
          { label: "Pendente", value: `R$ ${metrics.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: Calendar, color: "amber" },
        ]}
        className="mb-6"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Ticket Médio</div>
          <div className="text-lg font-bold">R$ {metrics.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">MRR Clínico</div>
          <div className="text-lg font-bold text-green-500">R$ {metrics.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Inadimplência</div>
          <div className={`text-lg font-bold ${metrics.delinquencyRate > 20 ? "text-red-500" : "text-green-500"}`}>{metrics.delinquencyRate}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Pacientes Ativos</div>
          <div className="text-lg font-bold">{metrics.uniquePatients}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" />Vencidos</div>
          <div className="text-lg font-bold text-red-500">R$ {metrics.overdue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList className="bg-muted/50 mb-6">
          <TabsTrigger value="overview" className="gap-2"><TrendingUp className="h-4 w-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="dre" className="gap-2"><BarChart3 className="h-4 w-4" />DRE</TabsTrigger>
          <TabsTrigger value="projections" className="gap-2"><Target className="h-4 w-4" />Projeções</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2"><PieChart className="h-4 w-4" />Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinancialChart data={chartData} />
        </TabsContent>

        <TabsContent value="dre" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />DRE Simplificada</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <span className="font-medium text-green-600">Receita Bruta</span>
                  <span className="font-bold text-green-600">R$ {metrics.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <span className="font-medium text-red-600">(-) Despesas Operacionais</span>
                  <span className="font-bold text-red-600">R$ {metrics.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="font-bold text-lg">Lucro Líquido</span>
                    <span className={`font-bold text-lg ${metrics.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      R$ {metrics.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                  <span className="font-bold">
                    {metrics.income > 0 ? Math.round((metrics.balance / metrics.income) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-6">
          <FinancialProjections
            data={{
              currentMonth: metrics.income,
              projectedMonth: Math.round(metrics.income * 1.15),
              yearToDate: metrics.income * 6,
              projectedYear: Math.round(metrics.income * 12 * 1.1),
              avgSessionValue: metrics.ticketMedio || 200,
              monthlyTarget: 15000,
              trend: metrics.incomeChange > 0 ? "up" : metrics.incomeChange < 0 ? "down" : "stable",
              insights: [
                metrics.incomeChange > 0
                  ? `📈 Sua receita cresceu ${metrics.incomeChange}% em relação ao mês anterior`
                  : `📉 Sua receita caiu ${Math.abs(metrics.incomeChange)}% em relação ao mês anterior`,
                `💰 Ticket médio por paciente: R$ ${metrics.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                metrics.delinquencyRate > 10
                  ? `⚠️ Inadimplência em ${metrics.delinquencyRate}% — considere revisar cobranças`
                  : `✅ Inadimplência controlada em ${metrics.delinquencyRate}%`,
                `🎯 Faltam R$ ${Math.max(0, 15000 - metrics.income).toLocaleString("pt-BR")} para a meta mensal`,
              ],
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <CategoryAnalysis
              type="income"
              categories={incomeCategories.length > 0 ? incomeCategories : [
                { name: "Consultas", value: 0, percentage: 0, trend: "stable", color: "hsl(142, 76%, 36%)" },
              ]}
            />
            <CategoryAnalysis
              type="expense"
              categories={expenseCategories.length > 0 ? expenseCategories : [
                { name: "Sem despesas", value: 0, percentage: 0, trend: "stable", color: "hsl(0, 84%, 60%)" },
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-[200px]" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Transação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tipo</Label><Select name="type" required><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent></Select></div>
                <div><Label>Valor</Label><Input name="amount" type="number" step="0.01" placeholder="0.00" required /></div>
                <div><Label>Paciente</Label><Select name="patient_id"><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Categoria</Label><Select name="category" required><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Consulta">Consulta</SelectItem><SelectItem value="Avaliação">Avaliação</SelectItem><SelectItem value="Aluguel">Aluguel</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Software">Software</SelectItem><SelectItem value="Materiais">Materiais</SelectItem><SelectItem value="Impostos">Impostos</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select></div>
                <div><Label>Pagamento</Label><Select name="payment_method" required><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="cash">Dinheiro</SelectItem><SelectItem value="credit_card">Cartão Crédito</SelectItem><SelectItem value="debit_card">Cartão Débito</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="bank_transfer">Transferência</SelectItem><SelectItem value="convenio">Convênio</SelectItem></SelectContent></Select></div>
                <div><Label>Status</Label><Select name="payment_status" required><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Atrasado</SelectItem></SelectContent></Select></div>
                <div className="col-span-2"><Label>Vencimento</Label><Input name="due_date" type="date" required /></div>
                <div className="col-span-2"><Label>Descrição</Label><Textarea name="description" placeholder="Descreva a transação" required /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader><CardTitle>Transações</CardTitle></CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <motion.div key={transaction.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {transaction.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.patient_name || transaction.category} • {transaction.due_date && format(new Date(transaction.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {Number(transaction.amount).toFixed(2)}
                      </p>
                      {getStatusBadge(transaction.payment_status)}
                    </div>
                    <ActionMenu onEdit={() => openEditDialog(transaction)} onDelete={() => handleDeleteTransaction(transaction.id)}
                      deleteTitle="Excluir Transação" deleteDescription="Tem certeza que deseja excluir esta transação?" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => { if (!open) { setEditingTransaction(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Transação</DialogTitle></DialogHeader>
          <form onSubmit={handleEditTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label><Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent></Select></div>
              <div><Label>Valor</Label><Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required /></div>
              <div><Label>Categoria</Label><Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Consulta">Consulta</SelectItem><SelectItem value="Avaliação">Avaliação</SelectItem><SelectItem value="Aluguel">Aluguel</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Software">Software</SelectItem><SelectItem value="Impostos">Impostos</SelectItem><SelectItem value="Outros">Outros</SelectItem></SelectContent></Select></div>
              <div><Label>Status</Label><Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Atrasado</SelectItem></SelectContent></Select></div>
              <div><Label>Vencimento</Label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} required /></div>
              <div><Label>Pagamento</Label><Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="credit_card">Cartão Crédito</SelectItem><SelectItem value="debit_card">Cartão Débito</SelectItem><SelectItem value="bank_transfer">Transferência</SelectItem><SelectItem value="convenio">Convênio</SelectItem></SelectContent></Select></div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setEditingTransaction(null); resetForm(); }}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
