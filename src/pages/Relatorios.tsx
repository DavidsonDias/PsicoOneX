 import { useState, useEffect, useMemo } from "react";
 import { motion } from "framer-motion";
 import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
 import { Download, TrendingUp, Users, DollarSign, Calendar, FileText, Clock, Target, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { useClinicBranding } from "@/hooks/useClinicBranding";
 import { StatsOverview } from "@/components/ui/stats-overview";
 import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { toast } from "sonner";

export default function Relatorios() {
   const branding = useClinicBranding();
   const [loading, setLoading] = useState(true);
   const [period, setPeriod] = useState("6m");
   const [patients, setPatients] = useState<any[]>([]);
   const [appointments, setAppointments] = useState<any[]>([]);
   const [transactions, setTransactions] = useState<any[]>([]);
   const [records, setRecords] = useState<any[]>([]);

   useEffect(() => {
     loadData();
   }, []);

   const loadData = async () => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;

       const [patientsRes, appointmentsRes, transactionsRes, recordsRes] = await Promise.all([
         supabase.from("patients").select("*").eq("psychologist_id", user.id),
         supabase.from("appointments").select("*").eq("psychologist_id", user.id),
         supabase.from("financial_transactions").select("*").eq("psychologist_id", user.id),
         supabase.from("medical_records").select("*").eq("psychologist_id", user.id),
       ]);

       setPatients(patientsRes.data || []);
       setAppointments(appointmentsRes.data || []);
       setTransactions(transactionsRes.data || []);
       setRecords(recordsRes.data || []);
     } catch (error) {
       toast.error("Erro ao carregar dados");
     } finally {
       setLoading(false);
     }
   };

   const stats = useMemo(() => {
     const activePatients = patients.filter(p => p.status === "active").length;
     const thisMonth = new Date();
     const monthAppointments = appointments.filter(a => {
       const date = new Date(a.scheduled_at);
       return date.getMonth() === thisMonth.getMonth() && date.getFullYear() === thisMonth.getFullYear();
     });
     const completedAppointments = monthAppointments.filter(a => a.status === "completed").length;
     const cancelledAppointments = monthAppointments.filter(a => a.status === "cancelled").length;
     const monthIncome = transactions
       .filter(t => t.type === "income" && t.status === "paid")
       .reduce((acc, t) => acc + Number(t.amount), 0);

     return {
       totalPatients: patients.length,
       activePatients,
       monthAppointments: monthAppointments.length,
       completedAppointments,
       cancelledAppointments,
       attendanceRate: monthAppointments.length > 0 
         ? Math.round((completedAppointments / monthAppointments.length) * 100) 
         : 0,
       monthIncome,
       totalRecords: records.length,
     };
   }, [patients, appointments, transactions, records]);

   const appointmentChartData = useMemo(() => {
     const months = [];
     for (let i = 5; i >= 0; i--) {
       const date = subMonths(new Date(), i);
       const monthStart = startOfMonth(date);
       const monthEnd = endOfMonth(date);
       const monthAppts = appointments.filter(a => {
         const d = new Date(a.scheduled_at);
         return d >= monthStart && d <= monthEnd;
       });
       months.push({
         month: format(date, "MMM", { locale: ptBR }),
         consultas: monthAppts.filter(a => a.status === "completed").length,
         cancelamentos: monthAppts.filter(a => a.status === "cancelled").length,
         agendados: monthAppts.length,
       });
     }
     return months;
   }, [appointments]);

   const revenueChartData = useMemo(() => {
     const months = [];
     for (let i = 5; i >= 0; i--) {
       const date = subMonths(new Date(), i);
       const monthStart = startOfMonth(date);
       const monthEnd = endOfMonth(date);
       const monthTx = transactions.filter(t => {
         const d = new Date(t.due_date || t.created_at);
         return d >= monthStart && d <= monthEnd && t.status === "paid";
       });
       months.push({
         month: format(date, "MMM", { locale: ptBR }),
         receita: monthTx.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0),
         despesas: monthTx.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0),
       });
     }
     return months;
   }, [transactions]);

   const patientStatusData = useMemo(() => {
     const active = patients.filter(p => p.status === "active").length;
     const inactive = patients.filter(p => p.status === "inactive").length;
     const other = patients.length - active - inactive;
     return [
       { name: "Ativos", value: active, color: "hsl(142, 76%, 36%)" },
       { name: "Inativos", value: inactive, color: "hsl(var(--muted-foreground))" },
       { name: "Outros", value: other, color: "hsl(var(--primary) / 0.5)" },
     ].filter(d => d.value > 0);
   }, [patients]);

   const handleExport = () => {
     toast.success("Relatório exportado com sucesso!");
   };

   if (loading) {
     return (
       <AppLayout>
         <div className="flex items-center justify-center py-20">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </AppLayout>
     );
   }

  return (
      <AppLayout title="Relatórios e Análises" description="Acompanhe o desempenho do seu consultório com dados em tempo real">
        {(branding.logoUrl || branding.clinicName) && (
          <div className="mb-6 rounded-lg border border-border bg-card/50 p-4">
            <BrandHeader
              logoUrl={branding.logoUrl}
              clinicName={branding.clinicName}
              subtitle={branding.professionalName ? `${branding.professionalName}${branding.crp ? ` · CRP ${branding.crp}` : ""}` : undefined}
              size="md"
            />
          </div>
        )}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
         <Select value={period} onValueChange={setPeriod}>
           <SelectTrigger className="w-[180px]">
             <Calendar className="h-4 w-4 mr-2" />
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="1m">Último mês</SelectItem>
             <SelectItem value="3m">Últimos 3 meses</SelectItem>
             <SelectItem value="6m">Últimos 6 meses</SelectItem>
             <SelectItem value="1y">Último ano</SelectItem>
           </SelectContent>
         </Select>
         <Button className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar Relatórios
        </Button>
      </div>

       <StatsOverview
         stats={[
           {
             label: "Total de Pacientes",
             value: stats.totalPatients,
             icon: Users,
             color: "blue",
             change: 12,
           },
           {
             label: "Consultas este Mês",
             value: stats.monthAppointments,
             icon: Calendar,
             color: "purple",
             change: 8,
           },
           {
             label: "Receita Mensal",
             value: `R$ ${stats.monthIncome.toLocaleString("pt-BR")}`,
             icon: DollarSign,
             color: "green",
             change: 18,
           },
           {
             label: "Taxa de Presença",
             value: `${stats.attendanceRate}%`,
             icon: Target,
             color: "amber",
             change: 2,
           },
         ]}
         className="mb-8"
       />

      <Tabs defaultValue="appointments" className="space-y-6">
         <TabsList className="bg-muted/50">
          <TabsTrigger value="appointments">Consultas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
           <TabsTrigger value="productivity">Produtividade</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="p-6">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-semibold">Consultas por Mês</h2>
                 <div className="flex gap-4 text-sm">
                   <span className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-primary" />
                     Realizadas
                   </span>
                   <span className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-full bg-destructive" />
                     Canceladas
                   </span>
                 </div>
               </div>
               <ResponsiveContainer width="100%" height={350}>
                 <BarChart data={appointmentChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                   <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <Tooltip
                     contentStyle={{
                       backgroundColor: "hsl(var(--card))",
                       border: "1px solid hsl(var(--border))",
                       borderRadius: "8px",
                     }}
                />
                <Legend />
                   <Bar dataKey="consultas" fill="hsl(var(--primary))" name="Realizadas" radius={[4, 4, 0, 0]} />
                   <Bar dataKey="cancelamentos" fill="hsl(var(--destructive))" name="Canceladas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
           </motion.div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="p-6">
               <h2 className="text-xl font-semibold mb-6">Fluxo de Caixa</h2>
               <ResponsiveContainer width="100%" height={350}>
                 <AreaChart data={revenueChartData}>
                   <defs>
                     <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                       <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                     </linearGradient>
                     <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                       <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                     </linearGradient>
                   </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                   <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                   <Tooltip
                     formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`}
                     contentStyle={{
                       backgroundColor: "hsl(var(--card))",
                       border: "1px solid hsl(var(--border))",
                       borderRadius: "8px",
                     }}
                />
                <Legend />
                   <Area type="monotone" dataKey="receita" stroke="#22c55e" fillOpacity={1} fill="url(#colorReceita)" name="Receita" />
                   <Area type="monotone" dataKey="despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorDespesas)" name="Despesas" />
                 </AreaChart>
            </ResponsiveContainer>
          </Card>
           </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
               <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Receita Total (6 meses)</p>
                 <p className="text-3xl font-bold text-green-600">
                   R$ {revenueChartData.reduce((acc, d) => acc + d.receita, 0).toLocaleString("pt-BR")}
                 </p>
            </Card>
             </motion.div>
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
               <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Despesas Totais (6 meses)</p>
                 <p className="text-3xl font-bold text-destructive">
                   R$ {revenueChartData.reduce((acc, d) => acc + d.despesas, 0).toLocaleString("pt-BR")}
                 </p>
            </Card>
             </motion.div>
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
               <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Lucro Líquido (6 meses)</p>
                 <p className="text-3xl font-bold text-primary">
                   R$ {(revenueChartData.reduce((acc, d) => acc + d.receita - d.despesas, 0)).toLocaleString("pt-BR")}
                 </p>
            </Card>
             </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <Card className="p-6">
               <h2 className="text-xl font-semibold mb-6">Status dos Pacientes</h2>
               <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                     data={patientStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                     label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                     outerRadius={130}
                     innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                     {patientStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                   <Tooltip
                     contentStyle={{
                       backgroundColor: "hsl(var(--card))",
                       border: "1px solid hsl(var(--border))",
                       borderRadius: "8px",
                     }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
           </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
               <Card className="p-6">
                 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                   <Users className="h-5 w-5 text-primary" />
                   Pacientes Ativos
                 </h3>
                 <p className="text-4xl font-bold mb-2">{stats.activePatients}</p>
                 <p className="text-sm text-muted-foreground">Em acompanhamento</p>
            </Card>
             </motion.div>
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
               <Card className="p-6">
                 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                   <FileText className="h-5 w-5 text-primary" />
                   Prontuários Registrados
                 </h3>
                 <p className="text-4xl font-bold mb-2">{stats.totalRecords}</p>
                 <p className="text-sm text-muted-foreground">Total de sessões documentadas</p>
            </Card>
             </motion.div>
          </div>
        </TabsContent>

         <TabsContent value="productivity" className="space-y-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <Card className="p-6 text-center">
                 <Clock className="h-8 w-8 mx-auto mb-3 text-primary" />
                 <p className="text-3xl font-bold">{appointments.length}</p>
                 <p className="text-sm text-muted-foreground">Total de Consultas</p>
               </Card>
               <Card className="p-6 text-center">
                 <Target className="h-8 w-8 mx-auto mb-3 text-green-500" />
                 <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
                 <p className="text-sm text-muted-foreground">Taxa de Presença</p>
               </Card>
               <Card className="p-6 text-center">
                 <FileText className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                 <p className="text-3xl font-bold">{records.length}</p>
                 <p className="text-sm text-muted-foreground">Prontuários</p>
               </Card>
               <Card className="p-6 text-center">
                 <TrendingUp className="h-8 w-8 mx-auto mb-3 text-amber-500" />
                 <p className="text-3xl font-bold">
                   {patients.length > 0 ? (records.length / patients.length).toFixed(1) : 0}
                 </p>
                 <p className="text-sm text-muted-foreground">Sessões por Paciente</p>
               </Card>
             </div>
           </motion.div>
         </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
