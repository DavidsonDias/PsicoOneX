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
  UserCheck, Calendar, FileText, DollarSign, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeletedRecord {
  id: string;
  entity_type: string;
  entity_name: string;
  deleted_at: string;
  deleted_by: string;
  deleted_by_name?: string;
  deleted_reason?: string;
  patient_id?: string;
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
  deletedPatients: number;
  deletedRecords: number;
  deletedAppointments: number;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [trashFilter, setTrashFilter] = useState("all");
  const [loadingData, setLoadingData] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
    await Promise.all([loadStats(), loadDeletedRecords(), loadAuditLogs(), loadProfiles()]);
    setLoadingData(false);
  };

  const loadStats = async () => {
    const [profilesRes, patientsRes, appointmentsRes, recordsRes, transactionsRes, delPatientsRes, delRecordsRes, delAppointmentsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("patients").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("appointments").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("medical_records").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("financial_transactions").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("patients").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("medical_records").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
      supabase.from("appointments").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
    ]);
    setStats({
      totalProfiles: profilesRes.count || 0,
      totalPatients: patientsRes.count || 0,
      totalAppointments: appointmentsRes.count || 0,
      totalRecords: recordsRes.count || 0,
      totalTransactions: transactionsRes.count || 0,
      deletedPatients: delPatientsRes.count || 0,
      deletedRecords: delRecordsRes.count || 0,
      deletedAppointments: delAppointmentsRes.count || 0,
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
      .limit(100);
    setAuditLogs((data as AuditLog[]) || []);
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
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

      toast({ title: "Restaurado!", description: `${record.entity_name} foi restaurado com sucesso.` });
      await Promise.all([loadDeletedRecords(), loadStats(), loadAuditLogs()]);
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
    } finally {
      setRestoringId(null);
    }
  };

  const entityTypeLabel: Record<string, string> = {
    patient: "Paciente",
    medical_record: "Prontuário",
    appointment: "Agendamento",
    financial_transaction: "Transação",
  };

  const entityTypeIcon: Record<string, React.ReactNode> = {
    patient: <Users className="h-4 w-4" />,
    medical_record: <FileText className="h-4 w-4" />,
    appointment: <Calendar className="h-4 w-4" />,
    financial_transaction: <DollarSign className="h-4 w-4" />,
  };

  const filteredTrash = deletedRecords.filter(r => {
    const matchesFilter = trashFilter === "all" || r.entity_type === trashFilter;
    const matchesSearch = !searchTerm || r.entity_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Super Admin</h1>
              <p className="text-xs text-muted-foreground">SevenDevX — Painel Master</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAllData} disabled={loadingData}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingData ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Voltar ao Sistema
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="gap-2 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="clinics" className="gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" /> Clínicas
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2 text-xs sm:text-sm">
              <Trash2 className="h-4 w-4" /> Lixeira
              {deletedRecords.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{deletedRecords.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 text-xs sm:text-sm">
              <ScrollText className="h-4 w-4" /> Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 text-xs sm:text-sm">
              <Settings className="h-4 w-4" /> Config
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Profissionais", value: stats?.totalProfiles || 0, icon: UserCheck, color: "text-primary" },
                { label: "Pacientes Ativos", value: stats?.totalPatients || 0, icon: Users, color: "text-emerald-500" },
                { label: "Sessões Realizadas", value: stats?.totalRecords || 0, icon: FileText, color: "text-blue-500" },
                { label: "Agendamentos", value: stats?.totalAppointments || 0, icon: Calendar, color: "text-amber-500" },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color} opacity-70`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Deleted items summary */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Registros Excluídos (Recuperáveis)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Pacientes", value: stats?.deletedPatients || 0 },
                    { label: "Prontuários", value: stats?.deletedRecords || 0 },
                    { label: "Agendamentos", value: stats?.deletedAppointments || 0 },
                  ].map((s, i) => (
                    <div key={i} className="text-center p-3 rounded-lg bg-destructive/5">
                      <p className="text-2xl font-bold text-destructive">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                {(stats?.deletedPatients || 0) + (stats?.deletedRecords || 0) + (stats?.deletedAppointments || 0) > 0 && (
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setActiveTab("trash")}>
                    Ver Lixeira <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLÍNICAS / PROFISSIONAIS */}
          <TabsContent value="clinics" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar profissional..." className="pl-10"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {profiles
                .filter(p => !searchTerm || p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(profile => (
                  <Card key={profile.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {profile.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.crp && `CRP: ${profile.crp}`}
                            {profile.specialty && ` • ${profile.specialty}`}
                          </p>
                          {profile.clinic_name && (
                            <p className="text-xs text-muted-foreground">{profile.clinic_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Ativo</Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {profiles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum profissional encontrado</p>
              )}
            </div>
          </TabsContent>

          {/* LIXEIRA GLOBAL */}
          <TabsContent value="trash" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Lixeira Global — Data Recovery
                </CardTitle>
                <CardDescription>Registros excluídos que podem ser restaurados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar registro excluído..." className="pl-10"
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["all", "patient", "medical_record", "appointment", "financial_transaction"].map(filter => (
                      <Button key={filter} variant={trashFilter === filter ? "default" : "outline"} size="sm"
                        onClick={() => setTrashFilter(filter)}>
                        {filter === "all" ? "Todos" : entityTypeLabel[filter]}
                      </Button>
                    ))}
                  </div>
                </div>

                {filteredTrash.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Lixeira vazia</p>
                    <p className="text-sm">Nenhum registro excluído encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTrash.map(record => (
                      <div key={`${record.entity_type}-${record.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors bg-card">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
                            {entityTypeIcon[record.entity_type]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{record.entity_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] h-5">
                                {entityTypeLabel[record.entity_type]}
                              </Badge>
                              <span>Excluído em {format(new Date(record.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                            {record.deleted_reason && (
                              <p className="text-xs text-muted-foreground mt-0.5">Motivo: {record.deleted_reason}</p>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline"
                          className="gap-1 shrink-0 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIT LOGS */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Logs de Auditoria
                </CardTitle>
                <CardDescription>Registro completo de todas as ações do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum log registrado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border text-sm">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ScrollText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={log.action_type === "delete" ? "destructive" : log.action_type === "restore" ? "default" : "secondary"} className="text-[10px]">
                              {log.action_type}
                            </Badge>
                            <span className="text-muted-foreground text-xs">{log.entity_type}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações Globais</CardTitle>
                <CardDescription>Configurações do sistema PsicoOne</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-1">Versão do Sistema</p>
                  <p className="text-xs text-muted-foreground">PsicoOne v2.0 — Enterprise Edition</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-1">Soft Delete</p>
                  <p className="text-xs text-muted-foreground">Ativo em todas as tabelas principais. Nenhum registro é excluído permanentemente sem autorização do Super Admin.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-1">Auditoria</p>
                  <p className="text-xs text-muted-foreground">Todas as ações críticas são registradas no log de auditoria com timestamp e identificação do usuário.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdmin;
