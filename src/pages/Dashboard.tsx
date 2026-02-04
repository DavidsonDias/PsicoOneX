import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Calendar, FileText, DollarSign, 
  Heart, BarChart3, Video, Receipt, ClipboardList,
  ArrowRight, TrendingUp, Clock, CheckCircle2,
  Sparkles, Bell, Brain, Plus, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/ui/metric-card";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { NotificationCenter, Notification } from "@/components/notifications/NotificationCenter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TodayAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  patients: {
    full_name: string;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    records: 0,
    revenue: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<TodayAppointment[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Mock chart data
  const [chartData] = useState([
    { name: "Jan", receitas: 4500, despesas: 1200 },
    { name: "Fev", receitas: 5200, despesas: 1400 },
    { name: "Mar", receitas: 4800, despesas: 1100 },
    { name: "Abr", receitas: 6100, despesas: 1600 },
    { name: "Mai", receitas: 5800, despesas: 1300 },
    { name: "Jun", receitas: 7200, despesas: 1800 },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Load stats
      const [patientsRes, appointmentsRes, recordsRes, transactionsRes] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("medical_records").select("*", { count: "exact", head: true }),
        supabase.from("financial_transactions")
          .select("amount, status")
          .eq("type", "income"),
      ]);

      const paidRevenue = transactionsRes.data?.filter(t => t.status === "paid")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const pending = transactionsRes.data?.filter(t => t.status === "pending")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      setPendingPayments(pending);

      setStats({
        patients: patientsRes.count || 0,
        appointments: appointmentsRes.count || 0,
        records: recordsRes.count || 0,
        revenue: paidRevenue,
      });

      // Load today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from("appointments")
        .select(`
          id,
          scheduled_at,
          status,
          patients (full_name)
        `)
        .eq("psychologist_id", session.user.id)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${today}T23:59:59`)
        .order("scheduled_at", { ascending: true });

      setTodayAppointments((todayData as any) || []);

      // Load all appointments for calendar
      const { data: allData } = await supabase
        .from("appointments")
        .select(`
          id,
          scheduled_at,
          status,
          patients (full_name)
        `)
        .eq("psychologist_id", session.user.id)
        .order("scheduled_at", { ascending: true });

      setAllAppointments((allData as any) || []);

      // Generate mock notifications
      generateNotifications(pending, todayData?.length || 0);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const generateNotifications = (pending: number, todayCount: number) => {
    const notifs: Notification[] = [];
    
    if (pending > 0) {
      notifs.push({
        id: "1",
        type: "payment",
        title: "Pagamentos pendentes",
        message: `Você tem R$ ${pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber`,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        action: { label: "Ver", path: "/financeiro" },
      });
    }

    if (todayCount > 0) {
      notifs.push({
        id: "2",
        type: "appointment",
        title: "Agenda do dia",
        message: `Você tem ${todayCount} consulta${todayCount > 1 ? "s" : ""} hoje`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        read: false,
        action: { label: "Ver agenda", path: "/agenda" },
      });
    }

    notifs.push({
      id: "3",
      type: "system",
      title: "Novo recurso disponível",
      message: "Experimente o Assistente IA para otimizar sua prática clínica",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true,
      action: { label: "Explorar", path: "/assistente-ia" },
    });

    setNotifications(notifs);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const quickActions = [
    { icon: Users, label: "Novo Paciente", description: "Cadastrar paciente", onClick: () => navigate("/pacientes"), variant: "primary" as const },
    { icon: Calendar, label: "Agendar", description: "Nova consulta", onClick: () => navigate("/agenda"), variant: "default" as const },
    { icon: FileText, label: "Prontuário", description: "Criar registro", onClick: () => navigate("/prontuarios"), variant: "default" as const },
    { icon: Brain, label: "PsicoAI", description: "Assistente IA", onClick: () => navigate("/assistente-ia"), badge: "Novo", variant: "gradient" as const },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500",
      confirmed: "bg-green-500",
      completed: "bg-purple-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || colors.scheduled;
  };

  // Calculate completion rate
  const completedToday = todayAppointments.filter(a => a.status === "completed").length;
  const completionRate = todayAppointments.length > 0 
    ? (completedToday / todayAppointments.length) * 100 
    : 0;

  return (
    <AppLayout>
      {/* Header with Welcome and Notifications */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </motion.div>
        
        <div className="flex items-center gap-2">
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNavigate={navigate}
          />
          <Button variant="outline" size="sm" onClick={() => navigate("/agenda")} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Consulta</span>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <MetricCard
          icon={Users}
          title="Pacientes Ativos"
          value={stats.patients}
          change={{ value: 12, period: "vs. mês anterior" }}
          sparkline={[10, 15, 12, 18, 20, 22, stats.patients]}
          variant="gradient"
        />
        <MetricCard
          icon={Calendar}
          title="Sessões Este Mês"
          value={stats.appointments}
          change={{ value: 8, period: "total" }}
          sparkline={[5, 8, 10, 7, 12, 15, stats.appointments]}
        />
        <MetricCard
          icon={FileText}
          title="Prontuários"
          value={stats.records}
          change={{ value: 5, period: "novos" }}
          sparkline={[2, 4, 3, 6, 5, 8, stats.records]}
        />
        <MetricCard
          icon={DollarSign}
          title="Receita"
          value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          change={{ value: 15, period: "vs. anterior" }}
          sparkline={[3000, 4500, 4000, 5200, 4800, 6000, stats.revenue]}
          variant="gradient"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column - 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <RevenueChart data={chartData} />
          </motion.div>

          {/* Today's Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Agenda de Hoje
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {todayAppointments.length} consulta{todayAppointments.length !== 1 ? "s" : ""} programada{todayAppointments.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={completionRate}
                    size="md"
                    variant={completionRate >= 80 ? "success" : completionRate >= 50 ? "warning" : "primary"}
                    label="concluído"
                  />
                  <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
                    Ver Tudo
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum agendamento para hoje</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-sm"
                      onClick={() => navigate("/agenda")}
                    >
                      Criar agendamento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayAppointments.slice(0, 5).map((apt, index) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate("/agenda")}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(apt.status)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{apt.patients.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.scheduled_at), "HH:mm")}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {quickActions.map((action, index) => (
                  <QuickActionCard
                    key={action.label}
                    icon={action.icon}
                    title={action.label}
                    description={action.description}
                    onClick={action.onClick}
                    variant={action.variant}
                    badge={action.badge}
                  />
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <WeeklyCalendar
              appointments={allAppointments}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onAppointmentClick={() => navigate("/agenda")}
            />
          </motion.div>

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <InsightsPanel
              patientsCount={stats.patients}
              appointmentsCount={stats.appointments}
              pendingPayments={pendingPayments}
              revenue={stats.revenue}
              onNavigate={navigate}
            />
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
