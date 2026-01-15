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
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {profile?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao seu painel de gestão profissional
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Agenda de Hoje
                </CardTitle>
                <CardDescription>
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
                Ver Tudo
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum agendamento para hoje</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => navigate("/agenda")}
                  >
                    Criar agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt, index) => (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status)}`} />
                      <div className="flex-1">
                        <p className="font-medium">{apt.patients.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.scheduled_at), "HH:mm")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingPayments > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <DollarSign className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Pagamentos Pendentes</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Dica do dia</p>
                  <p className="text-xs text-muted-foreground">
                    Use ⌘K para busca rápida em qualquer tela
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
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse as principais funcionalidades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 justify-start gap-4 group hover:border-primary/50"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
