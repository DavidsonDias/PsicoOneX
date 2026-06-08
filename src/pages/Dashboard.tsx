import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Calendar, FileText,
  ArrowRight, Clock, CheckCircle2,
  Brain, Plus
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ProactiveInsightsPanel } from "@/components/dashboard/ProactiveInsightsPanel";
import { StrategicMetrics } from "@/components/dashboard/StrategicMetrics";
import { AutomationRulesPanel } from "@/components/dashboard/AutomationRulesPanel";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { CustomizableDashboard, type DashboardWidgetDef } from "@/components/dashboard/CustomizableDashboard";
import { NextSessionWidget, RevenueForecastWidget, OverdueWidget, InactivePatientsWidget } from "@/components/dashboard/SmartWidgets";
import { useNotifications } from "@/hooks/useNotifications";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useProactiveInsights } from "@/hooks/useProactiveInsights";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { format, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TodayAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  patients: { full_name: string };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<TodayAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { notifications, markAsRead, markAllAsRead, createNotification } = useNotifications();
  const { showOnboarding, authProvider, googleCalendarConnected, completeOnboarding } = useOnboarding();
  const { insights, metrics, isLoading: insightsLoading, refresh: refreshInsights } = useProactiveInsights();
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Pagamento realizado com sucesso! Sua assinatura está ativa.");
      window.history.replaceState({}, "", "/dashboard");
      supabase.functions.invoke("check-subscription").catch(() => {});
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);

      const { data: txData } = await supabase
        .from("financial_transactions")
        .select("amount, status, type, due_date")
        .eq("psychologist_id", session.user.id);

      const allTxs = txData || [];
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const ms = new Date(d.getFullYear(), d.getMonth(), 1);
        const me = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthTxs = allTxs.filter(t => {
          const td = new Date(t.due_date);
          return td >= ms && td <= me;
        });
        months.push({
          name: ms.toLocaleDateString("pt-BR", { month: "short" }),
          receitas: monthTxs.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0),
          despesas: monthTxs.filter(t => t.type === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0),
        });
      }
      setChartData(months);

      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, patients (full_name)")
        .eq("psychologist_id", session.user.id)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${today}T23:59:59`)
        .order("scheduled_at", { ascending: true });
      setTodayAppointments((todayData as any) || []);

      const { data: allData } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, patients (full_name)")
        .eq("psychologist_id", session.user.id)
        .order("scheduled_at", { ascending: true });
      setAllAppointments((allData as any) || []);

      const now = new Date();
      for (const apt of (todayData as any) || []) {
        const aptTime = new Date(apt.scheduled_at);
        const hoursUntil = differenceInHours(aptTime, now);
        if (hoursUntil > 0 && hoursUntil <= 2 && apt.status !== "completed" && apt.status !== "cancelled") {
          createNotification({
            type: "alert",
            title: "Consulta em breve!",
            message: `${apt.patients?.full_name} às ${format(aptTime, "HH:mm")} — em ${hoursUntil}h`,
            action_path: "/agenda",
            action_label: "Ver agenda",
          });
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const quickActions = [
    { icon: Users, label: "Novo Paciente", description: "Cadastrar paciente", onClick: () => navigate("/pacientes"), variant: "primary" as const },
    { icon: Calendar, label: "Agendar", description: "Nova consulta", onClick: () => navigate("/agenda"), variant: "default" as const },
    { icon: FileText, label: "Prontuário", description: "Criar registro", onClick: () => navigate("/prontuarios"), variant: "default" as const },
    { icon: Brain, label: "PsicoAI", description: "Assistente IA", onClick: () => navigate("/assistente-ia"), badge: "Novo", variant: "gradient" as const },
  ];

  const getStatusColor = (status: string) => ({
    scheduled: "bg-blue-500", confirmed: "bg-green-500",
    completed: "bg-purple-500", cancelled: "bg-red-500",
  }[status] || "bg-blue-500");

  const completedToday = todayAppointments.filter(a => a.status === "completed").length;
  const completionRate = todayAppointments.length > 0 ? (completedToday / todayAppointments.length) * 100 : 0;

  const widgets: DashboardWidgetDef[] = [
    {
      id: "metrics", label: "Métricas Estratégicas",
      description: "KPIs do consultório (MRR, ocupação, ticket médio)",
      render: () => <StrategicMetrics metrics={metrics} isLoading={insightsLoading} />,
    },
    {
      id: "revenue", label: "Receitas vs Despesas",
      description: "Gráfico dos últimos 6 meses",
      render: () => <RevenueChart data={chartData} />,
    },
    {
      id: "today", label: "Agenda de Hoje",
      description: "Próximas consultas do dia",
      render: () => (
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
                value={completionRate} size="md"
                variant={completionRate >= 80 ? "success" : completionRate >= 50 ? "warning" : "primary"}
                label="concluído"
              />
              <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
                Ver Tudo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum agendamento para hoje</p>
                <Button variant="link" className="mt-2 text-sm" onClick={() => navigate("/agenda")}>
                  Criar agendamento
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.slice(0, 5).map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
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
      ),
    },
    {
      id: "quick", label: "Ações Rápidas",
      description: "Atalhos para pacientes, agenda, prontuários e IA",
      render: () => (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-4 pt-0">
            {quickActions.map((a) => (
              <QuickActionCard key={a.label} icon={a.icon} title={a.label}
                description={a.description} onClick={a.onClick} variant={a.variant} badge={a.badge} />
            ))}
          </CardContent>
        </Card>
      ),
    },
    {
      id: "insights", label: "Insights da IA",
      description: "Sugestões proativas baseadas no consultório",
      render: () => (
        <ProactiveInsightsPanel insights={insights} isLoading={insightsLoading}
          onRefresh={refreshInsights} onNavigate={navigate} />
      ),
    },
    {
      id: "automation", label: "Regras de Automação",
      description: "Mini-Zapier do PsicoOne",
      render: () => <AutomationRulesPanel />,
    },
    {
      id: "weekly", label: "Calendário Semanal",
      description: "Visão da semana com agendamentos",
      render: () => (
        <WeeklyCalendar appointments={allAppointments} selectedDate={selectedDate}
          onDateChange={setSelectedDate} onAppointmentClick={() => navigate("/agenda")} />
      ),
    },
    {
      id: "next_session", label: "Próxima Sessão",
      description: "Mostra a próxima sessão agendada",
      render: () => <NextSessionWidget />,
    },
    {
      id: "revenue_forecast", label: "Receita Prevista vs Recebida",
      description: "Acompanha o faturamento do mês corrente",
      render: () => <RevenueForecastWidget />,
    },
    {
      id: "overdue", label: "Inadimplência",
      description: "Cobranças em atraso e total devido",
      render: () => <OverdueWidget />,
    },
    {
      id: "inactive_patients", label: "Pacientes Inativos",
      description: "Pacientes sem sessão há mais de 30 dias",
      render: () => <InactivePatientsWidget />,
    },
  ];

  return (
    <AppLayout>
      {showOnboarding && (
        <OnboardingTour authProvider={authProvider} googleCalendarConnected={googleCalendarConnected}
          onComplete={completeOnboarding} onSkip={completeOnboarding} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </motion.div>
        <div className="flex items-center gap-2">
          <NotificationCenter notifications={notifications} onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead} onNavigate={navigate} />
          <Button variant="outline" size="sm" onClick={() => navigate("/agenda")} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Consulta</span>
          </Button>
        </div>
      </div>

      <CustomizableDashboard widgets={widgets} />
    </AppLayout>
  );
}
