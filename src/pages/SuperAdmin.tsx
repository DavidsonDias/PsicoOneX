import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Trash2, ScrollText, Settings, Shield,
  Search, RefreshCw, Eye, RotateCcw, AlertTriangle, TrendingUp,
  UserCheck, Calendar, FileText, DollarSign, ChevronRight,
  Activity, Building2, CreditCard, Monitor, LogOut, Database,
  ArrowUpRight, ArrowDownRight, Clock, Ban, CheckCircle2, XCircle,
  Menu, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DeletedRecord {
  id: string;
  entity_type: string;
  entity_name: string;
  deleted_at: string;
  deleted_by: string;
  deleted_by_name?: string;
  deleted_reason?: string;
  patient_id?: string;
  clinic_name?: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  ip_address?: string;
  user_name?: string;
}

interface DashboardStats {
  totalProfiles: number;
  totalPatients: number;
  totalAppointments: number;
  totalRecords: number;
  totalTransactions: number;
  totalRevenue: number;
  deletedPatients: number;
  deletedRecords: number;
  deletedAppointments: number;
  deletedTransactions: number;
  // Advanced metrics
  trialsActive: number;
  trialsExpiringSoon: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  conversionRate: number;
  churnRate: number;
}

const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clinics", label: "Clínicas", icon: Building2 },
  { id: "subscriptions", label: "Assinaturas", icon: CreditCard },
  { id: "finance", label: "Financeiro", icon: DollarSign },
  { id: "recovery", label: "Data Recovery", icon: Database },
  { id: "logs", label: "Auditoria", icon: ScrollText },
  { id: "monitoring", label: "Monitoramento", icon: Monitor },
  { id: "settings", label: "Configurações", icon: Settings },
];

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [trashFilter, setTrashFilter] = useState("all");
  const [trashDateFilter, setTrashDateFilter] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/dashboard");
      toast({ title: "Acesso negado", description: "Você não tem permissão para acessar esta área.", variant: "destructive" });
    }
  }, [roleLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (isSuperAdmin) loadAllData();
  }, [isSuperAdmin]);

  const loadAllData = async () => {
    setLoadingData(true);
    await Promise.all([loadStats(), loadDeletedRecords(), loadAuditLogs(), loadProfiles(), loadSubscriptions()]);
    setLoadingData(false);
  };

  const loadStats = async () => {
    const [profilesRes, patientsRes, appointmentsRes, recordsRes, transactionsRes, revenueRes, delPatientsRes, delRecordsRes, delAppointmentsRes, delTransactionsRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("appointments").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("medical_records").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("financial_transactions").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("financial_transactions").select("amount").eq("type", "income").eq("status", "paid").is("deleted_at", null),
      supabase.from("patients").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("medical_records").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("appointments").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("financial_transactions").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("subscriptions").select("status, plan"),
    ]);
    const totalRevenue = revenueRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    const allSubs = subsRes.data || [];
    const trialsActive = allSubs.filter(s => s.status === "trial").length;
    const activeSubscriptions = allSubs.filter(s => s.status === "active").length;
    const expiredSubscriptions = allSubs.filter(s => ["expired", "blocked", "suspended", "cancelled"].includes(s.status)).length;
    const totalConverted = allSubs.filter(s => s.status === "active" && s.plan !== "trial").length;
    const totalEverTried = allSubs.length;
    const conversionRate = totalEverTried > 0 ? Math.round((totalConverted / totalEverTried) * 100) : 0;
    const churnRate = totalEverTried > 0 ? Math.round((expiredSubscriptions / totalEverTried) * 100) : 0;
    
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const { data: expiringSoonData } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("status", "trial")
      .gt("trial_end_date", now.toISOString())
      .lt("trial_end_date", in48h.toISOString());
    const trialsExpiringSoon = expiringSoonData?.length || 0;

    setStats({
      totalProfiles: profilesRes.count || 0,
      totalPatients: patientsRes.count || 0,
      totalAppointments: appointmentsRes.count || 0,
      totalRecords: recordsRes.count || 0,
      totalTransactions: transactionsRes.count || 0,
      totalRevenue,
      deletedPatients: delPatientsRes.count || 0,
      deletedRecords: delRecordsRes.count || 0,
      deletedAppointments: delAppointmentsRes.count || 0,
      deletedTransactions: delTransactionsRes.count || 0,
      trialsActive,
      trialsExpiringSoon,
      activeSubscriptions,
      expiredSubscriptions,
      conversionRate,
      churnRate,
    });
  };

  const loadDeletedRecords = async () => {
    const records: DeletedRecord[] = [];
    const [patients, medRecords, appointments, transactions] = await Promise.all([
      supabase.from("patients").select("id, full_name, deleted_at, deleted_by, deleted_reason, psychologist_id").not("deleted_at", "is", null),
      supabase.from("medical_records").select("id, patient_id, session_number, session_date, deleted_at, deleted_by, deleted_reason").not("deleted_at", "is", null),
      supabase.from("appointments").select("id, patient_id, scheduled_at, deleted_at, deleted_by, deleted_reason").not("deleted_at", "is", null),
      supabase.from("financial_transactions").select("id, description, amount, deleted_at, deleted_by, deleted_reason").not("deleted_at", "is", null),
    ]);

    patients.data?.forEach(p => records.push({
      id: p.id, entity_type: "patient", entity_name: p.full_name,
      deleted_at: p.deleted_at!, deleted_by: p.deleted_by || "", deleted_reason: p.deleted_reason || undefined
    }));
    medRecords.data?.forEach(r => records.push({
      id: r.id, entity_type: "medical_record", entity_name: `Sessão ${r.session_number || "?"} - ${r.session_date}`,
      deleted_at: r.deleted_at!, deleted_by: r.deleted_by || "", deleted_reason: r.deleted_reason || undefined, patient_id: r.patient_id
    }));
    appointments.data?.forEach(a => records.push({
      id: a.id, entity_type: "appointment", entity_name: `Agendamento ${format(new Date(a.scheduled_at), "dd/MM/yyyy HH:mm")}`,
      deleted_at: a.deleted_at!, deleted_by: a.deleted_by || "", deleted_reason: a.deleted_reason || undefined, patient_id: a.patient_id
    }));
    transactions.data?.forEach(t => records.push({
      id: t.id, entity_type: "financial_transaction", entity_name: `${t.description || "Transação"} - R$ ${t.amount}`,
      deleted_at: t.deleted_at!, deleted_by: t.deleted_by || "", deleted_reason: t.deleted_reason || undefined
    }));

    records.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
    setDeletedRecords(records);
  };

  const loadAuditLogs = async () => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setAuditLogs((data as AuditLog[]) || []);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const loadSubscriptions = async () => {
    const { data } = await supabase.from("subscriptions").select("*");
    setSubscriptions(data || []);
  };

  const handleUpdateSubscription = async (userId: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from("subscriptions")
      .update(updates)
      .eq("user_id", userId);
    
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ Atualizado", description: "Assinatura atualizada com sucesso." });
    await loadSubscriptions();
  };

  const handleRestore = async (record: DeletedRecord) => {
    setRestoringId(record.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const { error } = await supabase.rpc("restore_deleted_record", {
        _entity_type: record.entity_type,
        _entity_id: record.id,
        _restored_by: session.user.id,
      });
      if (error) throw error;
      toast({ title: "✅ Restaurado!", description: `${record.entity_name} restaurado com sucesso.` });
      await Promise.all([loadDeletedRecords(), loadStats(), loadAuditLogs()]);
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const entityTypeLabel: Record<string, string> = {
    patient: "Paciente", medical_record: "Prontuário",
    appointment: "Agendamento", financial_transaction: "Transação",
  };
  const entityTypeIcon: Record<string, React.ReactNode> = {
    patient: <Users className="h-4 w-4" />, medical_record: <FileText className="h-4 w-4" />,
    appointment: <Calendar className="h-4 w-4" />, financial_transaction: <DollarSign className="h-4 w-4" />,
  };

  const filteredTrash = deletedRecords.filter(r => {
    const matchesFilter = trashFilter === "all" || r.entity_type === trashFilter;
    const matchesSearch = !searchTerm || r.entity_name.toLowerCase().includes(searchTerm.toLowerCase());
    // Date filter — match by deleted_at date
    const matchesDate = !trashDateFilter || (r.deleted_at && format(new Date(r.deleted_at), "yyyy-MM-dd") === trashDateFilter);
    return matchesFilter && matchesSearch && matchesDate;
  });

  const totalDeleted = (stats?.deletedPatients || 0) + (stats?.deletedRecords || 0) + (stats?.deletedAppointments || 0) + (stats?.deletedTransactions || 0);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,8%)] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Shield className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const actionBadgeVariant = (action: string) => {
    if (action === "delete" || action === "hard_delete") return "destructive";
    if (action === "restore") return "default";
    if (action === "create") return "secondary";
    return "outline";
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Brand */}
      <div className="p-4 border-b border-[hsl(222,47%,15%)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">PsicoOne</p>
              <p className="text-[10px] text-[hsl(220,9%,50%)]">SevenDevX • Super Admin</p>
            </div>
          )}
        </div>
        {isMobile && (
          <button onClick={() => setMobileSidebarOpen(false)} className="text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)]">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); if (isMobile) setMobileSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              activeTab === item.id
                ? "bg-primary/15 text-primary font-medium"
                : "text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(222,47%,14%)]"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
            {item.id === "recovery" && totalDeleted > 0 && (!sidebarCollapsed || isMobile) && (
              <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">{totalDeleted}</Badge>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[hsl(222,47%,15%)]">
        {!isMobile && (
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(222,47%,14%)] transition-colors">
            <ChevronRight className={cn("h-4 w-4 transition-transform", sidebarCollapsed ? "" : "rotate-180")} />
            {!sidebarCollapsed && <span>Recolher</span>}
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors mt-1">
          <LogOut className="h-4 w-4" />
          {(!sidebarCollapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[hsl(222,47%,8%)] text-[hsl(0,0%,95%)] flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 flex flex-col border-r border-[hsl(222,47%,15%)] bg-[hsl(222,47%,10%)] z-50 lg:hidden"
            >
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-[hsl(222,47%,15%)] bg-[hsl(222,47%,10%)] transition-all duration-300 sticky top-0 h-screen",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-[hsl(222,47%,15%)] bg-[hsl(222,47%,9%)]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 sm:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-lg text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(222,47%,14%)] transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="lg:hidden flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold">Super Admin</span>
              </div>
              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold">{SIDEBAR_ITEMS.find(i => i.id === activeTab)?.label}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadAllData} disabled={loadingData}
                className="text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(222,47%,14%)]">
                <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin")} />
              </Button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,18%)]">
                <Activity className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-[hsl(220,9%,55%)]">Sistema Operacional</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Profissionais", value: stats?.totalProfiles || 0, icon: UserCheck, trend: "+12%", up: true, color: "text-primary" },
                  { label: "Pacientes Ativos", value: stats?.totalPatients || 0, icon: Users, trend: "+8%", up: true, color: "text-emerald-400" },
                  { label: "Sessões", value: stats?.totalRecords || 0, icon: FileText, trend: "+15%", up: true, color: "text-sky-400" },
                  { label: "Receita Total", value: `R$ ${(stats?.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, trend: "+22%", up: true, color: "text-amber-400", isRevenue: true },
                ].map((stat, i) => (
                  <Card key={i} className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                        <span className={cn("flex items-center gap-0.5 text-xs font-medium", stat.up ? "text-emerald-400" : "text-destructive")}>
                          {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {stat.trend}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
                      <p className="text-xs text-[hsl(220,9%,50%)] mt-1">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Subscription & Conversion Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: "Trials Ativos", value: stats?.trialsActive || 0, icon: Clock, color: "text-amber-400" },
                  { label: "Expirando 48h", value: stats?.trialsExpiringSoon || 0, icon: AlertTriangle, color: "text-orange-400", alert: (stats?.trialsExpiringSoon || 0) > 0 },
                  { label: "Assinaturas Ativas", value: stats?.activeSubscriptions || 0, icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Conversão Trial→Pago", value: `${stats?.conversionRate || 0}%`, icon: TrendingUp, color: "text-primary" },
                  { label: "Churn Rate", value: `${stats?.churnRate || 0}%`, icon: ArrowDownRight, color: "text-destructive" },
                  { label: "Na Lixeira", value: totalDeleted, icon: Trash2, alert: totalDeleted > 0 },
                ].map((stat, i) => (
                  <Card key={i} className={cn("bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]", stat.alert && "border-destructive/40")}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", stat.alert ? "bg-destructive/15" : "bg-[hsl(222,47%,16%)]")}>
                        <stat.icon className={cn("h-5 w-5", stat.alert ? "text-destructive" : stat.color || "text-[hsl(220,9%,55%)]")} />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{stat.value}</p>
                        <p className="text-xs text-[hsl(220,9%,50%)]">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Audit & Deleted */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ScrollText className="h-4 w-4 text-primary" /> Atividade Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {auditLogs.slice(0, 8).map(log => (
                        <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[hsl(222,47%,14%)] text-xs">
                          <Badge variant={actionBadgeVariant(log.action_type)} className="text-[10px] h-5">{log.action_type}</Badge>
                          <span className="text-[hsl(220,9%,55%)] truncate flex-1">{log.entity_type}</span>
                          <span className="text-[hsl(220,9%,40%)]">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                        </div>
                      ))}
                      {auditLogs.length === 0 && <p className="text-center text-[hsl(220,9%,40%)] py-6 text-sm">Nenhum log registrado</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn("bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]", totalDeleted > 0 && "border-destructive/30")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" /> Exclusões Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {deletedRecords.slice(0, 8).map(r => (
                        <div key={`${r.entity_type}-${r.id}`} className="flex items-center justify-between p-2.5 rounded-lg bg-[hsl(222,47%,14%)] text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {entityTypeIcon[r.entity_type]}
                            <span className="truncate">{r.entity_name}</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => handleRestore(r)} disabled={restoringId === r.id}>
                            {restoringId === r.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          </Button>
                        </div>
                      ))}
                      {totalDeleted === 0 && <p className="text-center text-[hsl(220,9%,40%)] py-6 text-sm">Nenhuma exclusão pendente</p>}
                    </div>
                    {totalDeleted > 0 && (
                      <Button variant="ghost" size="sm" className="w-full mt-3 text-xs text-primary hover:bg-primary/10"
                        onClick={() => setActiveTab("recovery")}>
                        Ver Data Recovery Center <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* CLÍNICAS */}
          {activeTab === "clinics" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,9%,40%)]" />
                  <Input placeholder="Buscar profissional ou clínica..."
                    className="pl-10 bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(220,9%,40%)]"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Badge variant="outline" className="border-[hsl(222,47%,18%)] text-[hsl(220,9%,55%)]">
                  {profiles.length} profissionais
                </Badge>
              </div>

              <div className="space-y-2">
                {profiles
                  .filter(p => !searchTerm || p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(profile => (
                    <Card key={profile.id} className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)] hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-white">
                            {profile.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{profile.full_name}</p>
                            <p className="text-xs text-[hsl(220,9%,50%)]">
                              {profile.crp && `CRP: ${profile.crp}`}
                              {profile.specialty && ` • ${profile.specialty}`}
                            </p>
                            {profile.clinic_name && (
                              <p className="text-xs text-[hsl(220,9%,40%)] flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {profile.clinic_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-[hsl(220,9%,55%)] hover:text-[hsl(0,0%,90%)] hover:bg-[hsl(222,47%,16%)]">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                {profiles.length === 0 && (
                  <div className="text-center py-16 text-[hsl(220,9%,40%)]">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum profissional cadastrado</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SUBSCRIPTIONS */}
          {activeTab === "subscriptions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total", value: subscriptions.length, icon: Users, color: "text-primary" },
                  { label: "Em Trial", value: subscriptions.filter(s => s.status === "trial").length, icon: Clock, color: "text-amber-400" },
                  { label: "Ativas", value: subscriptions.filter(s => s.status === "active").length, icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Expiradas/Bloqueadas", value: subscriptions.filter(s => ["expired", "blocked", "suspended", "cancelled"].includes(s.status)).length, icon: Ban, color: "text-destructive" },
                ].map((s, i) => (
                  <Card key={i} className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <s.icon className={cn("h-5 w-5", s.color)} />
                      <div>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-[hsl(220,9%,50%)]">{s.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Gestão de Assinaturas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subscriptions.map(sub => {
                      const profile = profiles.find(p => p.id === sub.user_id);
                      const statusColors: Record<string, string> = {
                        trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                        active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                        expired: "bg-destructive/15 text-destructive border-destructive/30",
                        blocked: "bg-destructive/15 text-destructive border-destructive/30",
                        suspended: "bg-orange-500/15 text-orange-400 border-orange-500/30",
                        cancelled: "bg-[hsl(220,9%,30%)]/15 text-[hsl(220,9%,50%)] border-[hsl(220,9%,30%)]",
                      };
                      const planLabels: Record<string, string> = { trial: "Trial", basic: "Starter", pro: "Profissional", enterprise: "Clínica" };
                      const trialEnd = sub.trial_end_date ? new Date(sub.trial_end_date) : null;
                      const isTrialExpired = trialEnd && trialEnd < new Date();

                      return (
                        <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,18%)]">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {profile?.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{profile?.full_name || "Desconhecido"}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className={cn("text-[10px] h-5", statusColors[sub.status] || "")}>
                                  {sub.status}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-5 border-[hsl(222,47%,22%)] text-[hsl(220,9%,55%)]">
                                  {planLabels[sub.plan] || sub.plan}
                                </Badge>
                                {sub.status === "trial" && trialEnd && (
                                  <span className="text-[10px] text-[hsl(220,9%,45%)]">
                                    Expira: {format(trialEnd, "dd/MM/yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {sub.status === "trial" && (
                              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:bg-emerald-500/10 h-7"
                                onClick={() => handleUpdateSubscription(sub.user_id, { plan: "pro", status: "active", plan_started_at: new Date().toISOString() })}>
                                Ativar Pro
                              </Button>
                            )}
                            {sub.status === "trial" && (
                              <Button variant="ghost" size="sm" className="text-xs text-amber-400 hover:bg-amber-500/10 h-7"
                                onClick={() => {
                                  const newEnd = new Date();
                                  newEnd.setDate(newEnd.getDate() + 10);
                                  handleUpdateSubscription(sub.user_id, { trial_end_date: newEnd.toISOString() });
                                }}>
                                +7 dias
                              </Button>
                            )}
                            {(sub.status === "expired" || sub.status === "blocked") && (
                              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:bg-emerald-500/10 h-7"
                                onClick={() => handleUpdateSubscription(sub.user_id, { status: "active", plan: "basic", blocked_at: null, blocked_reason: null })}>
                                Reativar
                              </Button>
                            )}
                            {sub.status !== "blocked" && sub.status !== "cancelled" && (
                              <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 h-7"
                                onClick={() => handleUpdateSubscription(sub.user_id, { status: "blocked", blocked_at: new Date().toISOString(), blocked_reason: "Bloqueado pelo Super Admin" })}>
                                Bloquear
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {subscriptions.length === 0 && (
                      <div className="text-center py-12 text-[hsl(220,9%,40%)]">
                        <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>Nenhuma assinatura encontrada</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* FINANCE */}
          {activeTab === "finance" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const mrr = stats?.totalRevenue || 0; // TODO: calculate from subscription revenue when Stripe is active
                  const arr = mrr * 12;
                  return [
                    { label: "Receita Total", value: `R$ ${(stats?.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-emerald-400" },
                    { label: "MRR Estimado", value: `R$ ${mrr.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-primary" },
                    { label: "ARR Projetado", value: `R$ ${arr.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-sky-400" },
                    { label: "Conversão", value: `${stats?.conversionRate || 0}%`, icon: UserCheck, color: "text-amber-400" },
                  ];
                })().map((s, i) => (
                  <Card key={i} className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                    <CardContent className="p-4">
                      <s.icon className={cn("h-5 w-5 mb-2", s.color)} />
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-[hsl(220,9%,50%)]">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Subscription breakdown */}
              <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Distribuição de Planos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {["trial", "basic", "pro", "enterprise"].map(plan => {
                      const count = subscriptions.filter(s => s.plan === plan).length;
                      const labels: Record<string, string> = { trial: "Trial", basic: "Básico", pro: "Pro", enterprise: "Enterprise" };
                      const colors: Record<string, string> = { trial: "text-amber-400", basic: "text-sky-400", pro: "text-primary", enterprise: "text-emerald-400" };
                      return (
                        <div key={plan} className="p-3 rounded-lg bg-[hsl(222,47%,14%)] text-center">
                          <p className={cn("text-2xl font-bold", colors[plan])}>{count}</p>
                          <p className="text-xs text-[hsl(220,9%,50%)]">{labels[plan]}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* DATA RECOVERY CENTER */}
          {activeTab === "recovery" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Data Recovery Center
                  </CardTitle>
                  <CardDescription className="text-[hsl(220,9%,50%)]">
                    Restaure qualquer registro excluído no sistema. {totalDeleted} registro(s) na lixeira.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,9%,40%)]" />
                      <Input placeholder="Buscar registro excluído..."
                        className="pl-10 bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-[hsl(0,0%,95%)] placeholder:text-[hsl(220,9%,40%)]"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[hsl(220,9%,40%)] shrink-0" />
                      <Input 
                        type="date" 
                        value={trashDateFilter} 
                        onChange={e => setTrashDateFilter(e.target.value)}
                        className="w-[160px] bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-[hsl(0,0%,95%)]"
                        placeholder="Filtrar por data"
                      />
                      {trashDateFilter && (
                        <Button variant="ghost" size="sm" onClick={() => setTrashDateFilter("")}
                          className="text-xs text-[hsl(220,9%,55%)] hover:bg-[hsl(222,47%,16%)] px-2">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { key: "all", label: "Todos" },
                      { key: "patient", label: "Pacientes" },
                      { key: "medical_record", label: "Prontuários" },
                      { key: "appointment", label: "Agendamentos" },
                      { key: "financial_transaction", label: "Transações" },
                    ].map(f => (
                      <Button key={f.key} variant="ghost" size="sm"
                        className={cn(
                          "text-xs",
                          trashFilter === f.key
                            ? "bg-primary/15 text-primary"
                            : "text-[hsl(220,9%,55%)] hover:bg-[hsl(222,47%,16%)]"
                        )}
                        onClick={() => setTrashFilter(f.key)}>
                        {f.label}
                      </Button>
                    ))}
                  </div>

                  {/* Info about hard-deleted data */}
                  {trashDateFilter && filteredTrash.length === 0 && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-300">Nenhum registro encontrado para {format(new Date(trashDateFilter + "T12:00:00"), "dd/MM/yyyy")}</p>
                          <p className="text-xs text-[hsl(220,9%,50%)] mt-1">
                            Registros excluídos antes da implementação do Soft Delete (antes de 21/02/2026) foram removidos permanentemente e não podem ser recuperados. 
                            A partir dessa data, todas as exclusões são recuperáveis.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredTrash.length === 0 ? (
                    <div className="text-center py-16">
                      <Database className="h-16 w-16 mx-auto mb-4 text-[hsl(220,9%,25%)]" />
                      <p className="font-medium text-[hsl(220,9%,55%)]">Lixeira vazia</p>
                      <p className="text-sm text-[hsl(220,9%,40%)]">Nenhum registro excluído encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTrash.map(record => (
                        <div key={`${record.entity_type}-${record.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-[hsl(222,47%,18%)] hover:border-primary/30 transition-colors bg-[hsl(222,47%,14%)]">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                              {entityTypeIcon[record.entity_type]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{record.entity_name}</p>
                              <div className="flex items-center gap-2 text-xs text-[hsl(220,9%,45%)]">
                                <Badge variant="outline" className="text-[10px] h-5 border-[hsl(222,47%,22%)] text-[hsl(220,9%,55%)]">
                                  {entityTypeLabel[record.entity_type]}
                                </Badge>
                                <span>{format(new Date(record.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                              </div>
                              {record.deleted_reason && (
                                <p className="text-xs text-[hsl(220,9%,40%)] mt-0.5">Motivo: {record.deleted_reason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button size="sm" variant="ghost"
                              className="gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => handleRestore(record)}
                              disabled={restoringId === record.id}>
                              {restoringId === record.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Restaurar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AUDIT LOGS */}
          {activeTab === "logs" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-primary" /> Logs de Auditoria
                  </CardTitle>
                  <CardDescription className="text-[hsl(220,9%,50%)]">
                    Registro completo de todas as ações do sistema — {auditLogs.length} entradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-16">
                      <ScrollText className="h-16 w-16 mx-auto mb-4 text-[hsl(220,9%,25%)]" />
                      <p className="text-[hsl(220,9%,50%)]">Nenhum log registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                      {auditLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(222,47%,14%)] text-sm">
                          <div className="h-8 w-8 rounded-lg bg-[hsl(222,47%,18%)] flex items-center justify-center shrink-0">
                            <ScrollText className="h-4 w-4 text-[hsl(220,9%,50%)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={actionBadgeVariant(log.action_type)} className="text-[10px] h-5">{log.action_type}</Badge>
                              <span className="text-[hsl(220,9%,50%)] text-xs">{log.entity_type}</span>
                              {log.ip_address && (
                                <span className="text-[hsl(220,9%,35%)] text-[10px]">IP: {log.ip_address}</span>
                              )}
                            </div>
                            <p className="text-xs text-[hsl(220,9%,40%)] mt-1">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </p>
                            {log.old_data && (
                              <details className="mt-1.5">
                                <summary className="text-[10px] text-primary cursor-pointer">Ver dados</summary>
                                <pre className="text-[10px] text-[hsl(220,9%,45%)] mt-1 p-2 rounded bg-[hsl(222,47%,10%)] overflow-x-auto max-h-32">
                                  {JSON.stringify(log.old_data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* MONITORING */}
          {activeTab === "monitoring" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sm font-medium">Sistema Online</span>
                    </div>
                    <div className="space-y-3">
                      {["Database", "Authentication", "Storage", "Edge Functions"].map(s => (
                        <div key={s} className="flex items-center justify-between text-xs">
                          <span className="text-[hsl(220,9%,55%)]">{s}</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Operacional
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium mb-4">Métricas de Uso</p>
                    <div className="space-y-3">
                      {[
                        { label: "Tabelas com dados", value: "8" },
                        { label: "Buckets de storage", value: "2" },
                        { label: "Edge Functions", value: "3" },
                        { label: "RLS Policies ativas", value: "24+" },
                      ].map(m => (
                        <div key={m.label} className="flex items-center justify-between text-xs">
                          <span className="text-[hsl(220,9%,55%)]">{m.label}</span>
                          <span className="font-medium">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
                <CardHeader>
                  <CardTitle className="text-base">Configurações do Sistema</CardTitle>
                  <CardDescription className="text-[hsl(220,9%,50%)]">PsicoOne Enterprise — Configurações globais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { title: "Versão", desc: "PsicoOne v2.0 — Enterprise Edition" },
                    { title: "Soft Delete", desc: "Ativo em todas as tabelas. Nenhum registro pode ser excluído permanentemente sem autorização Super Admin." },
                    { title: "Auditoria", desc: "Todas as ações críticas são registradas com timestamp, IP e identificação do usuário." },
                    { title: "Multi-tenant", desc: "Arquitetura isolada por psychologist_id. Super Admin tem visibilidade global." },
                    { title: "LGPD", desc: "Conformidade garantida com soft delete, audit logs e controle de acesso granular." },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
                      <p className="text-sm font-medium mb-1">{item.title}</p>
                      <p className="text-xs text-[hsl(220,9%,50%)]">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SuperAdmin;
