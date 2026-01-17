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
  Sparkles, Bell
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
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
  const [pendingPayments, setPendingPayments] = useState(0);

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
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const quickActions = [
    { icon: Users, label: "Pacientes", path: "/pacientes", description: "Gerenciar cadastros", color: "text-blue-500" },
    { icon: Calendar, label: "Agenda", path: "/agenda", description: "Ver agendamentos", color: "text-purple-500" },
    { icon: FileText, label: "Prontuários", path: "/prontuarios", description: "Registros clínicos", color: "text-green-500" },
    { icon: ClipboardList, label: "Escalas", path: "/escalas", description: "Testes psicológicos", color: "text-amber-500" },
    { icon: DollarSign, label: "Financeiro", path: "/financeiro", description: "Pagamentos", color: "text-emerald-500" },
    { icon: Receipt, label: "Documentos", path: "/documentos", description: "Recibos e declarações", color: "text-indigo-500" },
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

  return (
    <AppLayout>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-8"
      >
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
          Olá, {profile?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Bem-vindo ao seu painel de gestão profissional
        </p>
      </motion.div>

      {/* Stats Grid - Mobile optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          icon={Users}
          title="Pacientes Ativos"
          value={stats.patients}
          trend={{ value: 12, label: "vs. mês anterior" }}
          variant="blue"
          delay={0}
        />
        <StatCard
          icon={Calendar}
          title="Agendamentos"
          value={stats.appointments}
          description="Total de sessões"
          variant="purple"
          delay={0.1}
        />
        <StatCard
          icon={FileText}
          title="Prontuários"
          value={stats.records}
          description="Registros criados"
          variant="green"
          delay={0.2}
        />
        <StatCard
          icon={DollarSign}
          title="Receita"
          value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend={{ value: 8, label: "total recebido" }}
          variant="amber"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Agenda de Hoje
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate("/agenda")}>
                Ver Tudo
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {todayAppointments.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">Nenhum agendamento para hoje</p>
                  <Button 
                    variant="link" 
                    className="mt-2 text-sm"
                    onClick={() => navigate("/agenda")}
                  >
                    Criar agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {todayAppointments.map((apt, index) => (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(apt.status)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{apt.patients.full_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
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

        {/* Alerts & Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {pendingPayments > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm">Pagamentos Pendentes</p>
                    <p className="text-xs text-muted-foreground truncate">
                      R$ {pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm">Dica do dia</p>
                  <p className="text-xs text-muted-foreground">
                    Use ⌘K para busca rápida
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 lg:mt-8"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acesse as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-4 p-4 pt-0">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto py-3 sm:py-4 flex-col sm:flex-row sm:justify-start gap-2 sm:gap-4 group hover:border-primary/50"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors ${action.color}`}>
                    <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="font-semibold text-xs sm:text-sm">{action.label}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{action.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
