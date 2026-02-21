import { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Search, Filter, Target, PieChart, Receipt, AlertTriangle, BarChart3, Upload, FileText, Paperclip } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { StatsOverview } from "@/components/ui/stats-overview";
import { FinancialChart } from "@/components/financial/FinancialChart";
import { FinancialProjections } from "@/components/financial/FinancialProjections";
import { CategoryAnalysis } from "@/components/financial/CategoryAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  type: "income" | "expense";
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
  cost_center?: string;
  attachment_url?: string;
  receipt_url?: string;
  invoice_status?: string;
  invoice_number?: string;
  tax_rate?: number;
  tax_amount?: number;
  appointment_id?: string;
}

const INCOME_CATEGORIES = ["Consulta", "Avaliação", "Laudo", "Supervisão", "Workshop", "Outros"];
const EXPENSE_CATEGORIES = ["Aluguel", "Marketing", "Software", "Materiais", "Impostos", "Estrutura", "Outros"];
const COST_CENTERS = ["Clínica", "Marketing", "Software", "Estrutura", "Impostos", "Pessoal", "Outros"];
const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão Crédito" },
  { value: "debit_card", label: "Cartão Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "bank_transfer", label: "Transferência" },
  { value: "convenio", label: "Convênio" },
  { value: "link", label: "Link de Pagamento" },
];

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: "income", amount: "", description: "", category: "",
    payment_method: "", payment_status: "pending", due_date: "",
    patient_id: "", cost_center: "", tax_rate: "0",
  });

  useEffect(() => { checkAuthAndLoadData(); }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    await Promise.all([loadTransactions(user.id), loadPatients(user.id)]);
    setLoading(false);
  };

  const loadTransactions = async (uid: string) => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select(`*, patients (full_name)`)
      .eq("psychologist_id", uid)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Erro ao carregar transações"); return; }

    const formatted = (data || []).map((t: any) => ({
      ...t, patient_name: t.patients?.full_name, payment_status: t.status,
    }));
    setTransactions(formatted);
  };

  const loadPatients = async (uid: string) => {
    const { data } = await supabase.from("patients").select("id, full_name")
      .eq("psychologist_id", uid).eq("status", "active").is("deleted_at", null).order("full_name");
    if (data) setPatients(data);
  };

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
    const overdue = transactions.filter(t => t.payment_status === "pending" && t.due_date && isAfter(now, new Date(t.due_date))).reduce((s, t) => s + Number(t.amount), 0);

    const lastIncome = lastMonth.filter(t => t.type === "income" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0);
    const incomeChange = lastIncome > 0 ? Math.round(((income - lastIncome) / lastIncome) * 100) : 0;

    const uniquePatients = new Set(thisMonth.filter(t => t.type === "income" && t.payment_status === "paid" && t.patient_id).map(t => t.patient_id));
    const ticketMedio = uniquePatients.size > 0 ? income / uniquePatients.size : 0;
    const mrr = income;

    const totalReceivable = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const delinquencyRate = totalReceivable > 0 ? Math.round((overdue / totalReceivable) * 100) : 0;

    const categoryMap: Record<string, number> = {};
    const expenseCategoryMap: Record<string, number> = {};
    const costCenterMap: Record<string, number> = {};
    thisMonth.forEach(t => {
      const cat = t.category || "Outros";
      if (t.type === "income") categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
      else expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + Number(t.amount);
      if (t.cost_center) costCenterMap[t.cost_center] = (costCenterMap[t.cost_center] || 0) + Number(t.amount);
    });

    return { income, expense, pending, overdue, incomeChange, ticketMedio, mrr, delinquencyRate,
      balance: income - expense, uniquePatients: uniquePatients.size, categoryMap, expenseCategoryMap, costCenterMap, totalReceivable };
  }, [transactions]);

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d); const me = endOfMonth(d);
      const monthTxs = transactions.filter(t => { const td = new Date(t.due_date); return td >= ms && td <= me; });
      months.push({
        month: format(d, "MMM", { locale: ptBR }),
        receita: monthTxs.filter(t => t.type === "income" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0),
        despesa: monthTxs.filter(t => t.type === "expense" && t.payment_status === "paid").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return months;
  }, [transactions]);

  const handleUploadAttachment = async (transactionId: string, file: File) => {
    setUploading(true);
    const path = `${userId}/${transactionId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("financial-attachments").upload(path, file);
    if (uploadError) { toast.error("Erro ao enviar arquivo"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("financial-attachments").getPublicUrl(path);

    await supabase.from("financial_transactions").update({ attachment_url: path } as any).eq("id", transactionId);
    toast.success("Comprovante anexado!");
    setUploading(false);
    await loadTransactions(userId);
  };

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const amount = parseFloat(fd.get("amount") as string);
    const taxRate = parseFloat(fd.get("tax_rate") as string) || 0;
    const taxAmount = amount * (taxRate / 100);

    const txData: any = {
      psychologist_id: userId, type: fd.get("type"), amount,
      description: fd.get("description"), category: fd.get("category"),
      payment_method: fd.get("payment_method"), status: fd.get("payment_status"),
      due_date: fd.get("due_date"), cost_center: fd.get("cost_center") || null,
      tax_rate: taxRate, tax_amount: taxAmount,
    };
    const pid = fd.get("patient_id");
    if (pid) txData.patient_id = pid;

    if (txData.status === "paid") txData.paid_date = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("financial_transactions").insert(txData);
    if (error) { toast.error("Erro ao criar transação"); console.error(error); return; }

    await supabase.from("audit_logs").insert({
      user_id: userId, action_type: "create", entity_type: "financial_transaction",
      new_data: { type: txData.type, amount, category: txData.category },
    } as any);

    toast.success("Transação criada!");
    setDialogOpen(false);
    loadTransactions(userId);
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const amount = parseFloat(formData.amount);
    const taxRate = parseFloat(formData.tax_rate) || 0;

    const updateData: any = {
      type: formData.type, amount, description: formData.description,
      category: formData.category, payment_method: formData.payment_method,
      status: formData.payment_status, due_date: formData.due_date,
      patient_id: formData.patient_id || null, cost_center: formData.cost_center || null,
      tax_rate: taxRate, tax_amount: amount * (taxRate / 100),
    };

    if (formData.payment_status === "paid" && editingTransaction.payment_status !== "paid") {
      updateData.paid_date = new Date().toISOString().split("T")[0];
    }

    const { error } = await supabase.from("financial_transactions").update(updateData).eq("id", editingTransaction.id);
    if (error) { toast.error("Erro ao atualizar"); return; }

    await supabase.from("audit_logs").insert({
      user_id: userId, action_type: "update", entity_type: "financial_transaction",
      entity_id: editingTransaction.id,
      old_data: { amount: editingTransaction.amount, status: editingTransaction.payment_status },
      new_data: { amount, status: formData.payment_status },
    } as any);

    toast.success("Transação atualizada!");
    setEditingTransaction(null);
    resetForm();
    loadTransactions(userId);
  };

  // Soft delete
  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from("financial_transactions")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId, deleted_reason: "Excluído pelo usuário" })
      .eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }

    await supabase.from("audit_logs").insert({
      user_id: userId, action_type: "soft_delete", entity_type: "financial_transaction", entity_id: id,
    } as any);

    toast.success("Transação excluída!");
    loadTransactions(userId);
  };

  const openEditDialog = (t: Transaction) => {
    setFormData({
      type: t.type, amount: t.amount.toString(), description: t.description,
      category: t.category, payment_method: t.payment_method,
      payment_status: t.payment_status, due_date: t.due_date,
      patient_id: t.patient_id || "", cost_center: t.cost_center || "",
      tax_rate: String(t.tax_rate || 0),
    });
    setEditingTransaction(t);
  };

  const resetForm = () => setFormData({
    type: "income", amount: "", description: "", category: "",
    payment_method: "", payment_status: "pending", due_date: "",
    patient_id: "", cost_center: "", tax_rate: "0",
  });

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

  if (loading) return (
    <AppLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </AppLayout>
  );

  const categories = formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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

  const TransactionForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo</Label>
          {isEdit ? (
            <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v, category: ""})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent>
            </Select>
          ) : (
            <Select name="type" required defaultValue="income">
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent><SelectItem value="income">Receita</SelectItem><SelectItem value="expense">Despesa</SelectItem></SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Valor (R$)</Label>
          {isEdit ? (
            <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
          ) : (
            <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
          )}
        </div>
        <div>
          <Label>Paciente</Label>
          {isEdit ? (
            <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select name="patient_id">
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Categoria</Label>
          {isEdit ? (
            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select name="category" required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{INCOME_CATEGORIES.concat(EXPENSE_CATEGORIES).filter((v, i, a) => a.indexOf(v) === i).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Pagamento</Label>
          {isEdit ? (
            <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select name="payment_method" required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Status</Label>
          {isEdit ? (
            <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Atrasado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent>
            </Select>
          ) : (
            <Select name="payment_status" required defaultValue="pending">
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="paid">Pago</SelectItem><SelectItem value="overdue">Atrasado</SelectItem></SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Vencimento</Label>
          {isEdit ? (
            <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} required />
          ) : (
            <Input name="due_date" type="date" required />
          )}
        </div>
        <div>
          <Label>Centro de Custo</Label>
          {isEdit ? (
            <Select value={formData.cost_center} onValueChange={(v) => setFormData({...formData, cost_center: v})}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{COST_CENTERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Select name="cost_center">
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{COST_CENTERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Taxa (%)</Label>
          {isEdit ? (
            <Input type="number" step="0.01" value={formData.tax_rate} onChange={(e) => setFormData({...formData, tax_rate: e.target.value})} />
          ) : (
            <Input name="tax_rate" type="number" step="0.01" defaultValue="0" placeholder="0" />
          )}
        </div>
        <div className="col-span-2">
          <Label>Descrição</Label>
          {isEdit ? (
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
          ) : (
            <Textarea name="description" placeholder="Descreva a transação" required />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { isEdit ? setEditingTransaction(null) : setDialogOpen(false); resetForm(); }}>Cancelar</Button>
        <Button type="submit">{isEdit ? "Salvar" : "Criar"}</Button>
      </div>
    </form>
  );

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

      {/* Cost Center Summary */}
      {Object.keys(metrics.costCenterMap).length > 0 && (
        <Card className="mb-6 p-4">
          <div className="text-sm font-medium mb-3 flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" />Centro de Custo</div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(metrics.costCenterMap).map(([center, value]) => (
              <Badge key={center} variant="outline" className="py-1.5 px-3">
                {center}: R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </Badge>
            ))}
          </div>
        </Card>
      )}

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
                  <span className="font-bold">{metrics.income > 0 ? Math.round((metrics.balance / metrics.income) * 100) : 0}%</span>
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
              categories={incomeCategories.length > 0 ? incomeCategories : [{ name: "Consultas", value: 0, percentage: 0, trend: "stable", color: "hsl(142, 76%, 36%)" }]}
            />
            <CategoryAnalysis
              type="expense"
              categories={expenseCategories.length > 0 ? expenseCategories : [{ name: "Sem despesas", value: 0, percentage: 0, trend: "stable", color: "hsl(0, 84%, 60%)" }]}
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
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Transação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
            <TransactionForm onSubmit={handleCreateTransaction} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader><CardTitle>Transações</CardTitle></CardHeader>
        <CardContent>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            const txId = fileInputRef.current?.dataset.txId;
            if (file && txId) handleUploadAttachment(txId, file);
          }} />

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
                    <div className={`p-2 rounded-lg ${transaction.type === "income" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {transaction.type === "income" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.patient_name || transaction.category}</span>
                        <span>•</span>
                        <span>{transaction.due_date && format(new Date(transaction.due_date), "dd/MM/yyyy")}</span>
                        {transaction.cost_center && (
                          <Badge variant="outline" className="text-xs ml-1">{transaction.cost_center}</Badge>
                        )}
                        {transaction.attachment_url && (
                          <Paperclip className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === "income" ? "text-green-500" : "text-red-500"}`}>
                        {transaction.type === "income" ? "+" : "-"} R$ {Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {getStatusBadge(transaction.payment_status)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.dataset.txId = transaction.id;
                          fileInputRef.current.click();
                        }
                      }} title="Anexar comprovante">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <ActionMenu onEdit={() => openEditDialog(transaction)} onDelete={() => handleDeleteTransaction(transaction.id)}
                        deleteTitle="Excluir Transação" deleteDescription="Tem certeza que deseja excluir esta transação?" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => { if (!open) { setEditingTransaction(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Transação</DialogTitle></DialogHeader>
          <TransactionForm onSubmit={handleEditTransaction} isEdit />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
