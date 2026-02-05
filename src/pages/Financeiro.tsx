import { useEffect, useState } from "react";
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
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
 import { StatsOverview } from "@/components/ui/stats-overview";
 import { FinancialChart } from "@/components/financial/FinancialChart";
 import { TransactionList } from "@/components/financial/TransactionList";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [pending, setPending] = useState(0);

  const [formData, setFormData] = useState({
    type: "income",
    amount: "",
    description: "",
    category: "",
    payment_method: "",
    payment_status: "pending",
    due_date: "",
    patient_id: ""
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

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

    if (error) {
      toast.error("Erro ao carregar transações");
      return;
    }

    const formatted = (data || []).map((t: any) => ({
      ...t,
      patient_name: t.patients?.full_name,
      payment_status: t.status
    }));

    setTransactions(formatted);
    calculateStats(formatted);
  };

  const loadPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq("psychologist_id", user.id)
      .eq("status", "active")
      .order("full_name");

    if (data) setPatients(data);
  };

  const calculateStats = (data: Transaction[]) => {
    let income = 0, expense = 0, pend = 0;

    data.forEach(t => {
      if (t.payment_status === 'paid') {
        if (t.type === 'income') income += Number(t.amount);
        else expense += Number(t.amount);
      } else if (t.payment_status === 'pending') {
        pend += Number(t.amount);
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setPending(pend);
  };

  const handleCreateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const transactionData: any = {
      psychologist_id: user.id,
      type: formDataObj.get("type"),
      amount: parseFloat(formDataObj.get("amount") as string),
      description: formDataObj.get("description"),
      category: formDataObj.get("category"),
      payment_method: formDataObj.get("payment_method"),
      status: formDataObj.get("payment_status"),
      due_date: formDataObj.get("due_date"),
    };

    const patientId = formDataObj.get("patient_id");
    if (patientId) transactionData.patient_id = patientId;

    const { error } = await supabase.from("financial_transactions").insert(transactionData);

    if (error) {
      toast.error("Erro ao criar transação");
      return;
    }

    toast.success("Transação criada com sucesso!");
    setDialogOpen(false);
    loadTransactions();
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const { error } = await supabase
      .from("financial_transactions")
      .update({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        payment_method: formData.payment_method,
        status: formData.payment_status,
        due_date: formData.due_date,
        patient_id: formData.patient_id || null
      })
      .eq("id", editingTransaction.id);

    if (error) {
      toast.error("Erro ao atualizar transação");
      return;
    }

    toast.success("Transação atualizada!");
    setEditingTransaction(null);
    resetForm();
    loadTransactions();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const { error } = await supabase.from("financial_transactions").delete().eq("id", transactionId);

    if (error) {
      toast.error("Erro ao excluir transação");
      return;
    }

    toast.success("Transação excluída!");
    loadTransactions();
  };

  const openEditDialog = (transaction: Transaction) => {
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.payment_method,
      payment_status: transaction.payment_status,
      due_date: transaction.due_date,
      patient_id: transaction.patient_id || ""
    });
    setEditingTransaction(transaction);
  };

  const resetForm = () => {
    setFormData({
      type: "income", amount: "", description: "", category: "",
      payment_method: "", payment_status: "pending", due_date: "", patient_id: ""
    });
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.payment_status !== filterStatus) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase()) 
        && !t.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
      cancelled: "outline"
    };
    const labels: Record<string, string> = {
      paid: "Pago", pending: "Pendente", overdue: "Atrasado", cancelled: "Cancelado"
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  return (
     <AppLayout title="Gestão Financeira Enterprise" description="Controle completo de receitas, despesas e análises">
       {/* Stats Overview */}
       <StatsOverview
         stats={[
           {
             label: "Receitas",
             value: `R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
             icon: TrendingUp,
             color: "green",
             change: 18,
           },
           {
             label: "Despesas",
             value: `R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
             icon: TrendingDown,
             color: "red",
             change: -5,
           },
           {
             label: "Saldo Líquido",
             value: `R$ ${(totalIncome - totalExpense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
             icon: DollarSign,
             color: "blue",
             change: 12,
           },
           {
             label: "Pendente",
             value: `R$ ${pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
             icon: Calendar,
             color: "amber",
           },
         ]}
         className="mb-6"
       />

       {/* Financial Chart */}
       <FinancialChart
         data={[
           { month: "Jan", receita: 9000, despesa: 3500 },
           { month: "Fev", receita: 10400, despesa: 3800 },
           { month: "Mar", receita: 9600, despesa: 3500 },
           { month: "Abr", receita: 12200, despesa: 4200 },
           { month: "Mai", receita: 11000, despesa: 3900 },
           { month: "Jun", receita: totalIncome || 13400, despesa: totalExpense || 4500 },
         ]}
       />

       <div className="mt-6" />
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
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
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select name="type" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div>
                  <Label>Paciente (opcional)</Label>
                  <Select name="patient_id">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input name="category" placeholder="Ex: Consulta" required />
                </div>
                <div>
                  <Label>Método de Pagamento</Label>
                  <Select name="payment_method" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="bank_transfer">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="payment_status" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Vencimento</Label>
                  <Input name="due_date" type="date" required />
                </div>
                <div className="col-span-2">
                  <Label>Descrição</Label>
                  <Textarea name="description" placeholder="Descreva a transação" required />
                </div>
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
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {transaction.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.patient_name || transaction.category} • {format(new Date(transaction.due_date), "dd/MM/yyyy")}
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
                    <ActionMenu
                      onEdit={() => openEditDialog(transaction)}
                      onDelete={() => handleDeleteTransaction(transaction.id)}
                      deleteTitle="Excluir Transação"
                      deleteDescription="Tem certeza que deseja excluir esta transação?"
                    />
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
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input 
                  type="date" 
                  value={formData.due_date} 
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                  required 
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  required 
                />
              </div>
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
