import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Save, Bell, Palette, FileText, Database, Download, Lock, Loader2,
  Shield, Plug, HelpCircle, User, Package, CheckCircle2, FileJson, FileSpreadsheet, FileArchive,
  KeyRound, LogOut, Upload, AlertTriangle, RotateCcw
} from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { GoogleCalendarSettings } from "@/components/settings/GoogleCalendarSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { exportMultiSheetExcel, exportToCSV } from "@/lib/export-utils";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExportFormat = "xlsx" | "json" | "csv";

interface ExportModules {
  patients: boolean;
  records: boolean;
  appointments: boolean;
  financial: boolean;
}

export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasOAuthCode = searchParams.has("code") && searchParams.has("state");
  const defaultTab = hasOAuthCode ? "integrations" : (searchParams.get("tab") || "profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [exportModules, setExportModules] = useState<ExportModules>({
    patients: true, records: true, appointments: true, financial: true,
  });
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null);
  const [importModules, setImportModules] = useState<ExportModules>({ patients: true, records: true, appointments: true, financial: true });
  const [importStrategy, setImportStrategy] = useState<"skip" | "replace">("skip");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { isAdmin } = useUserRole();
  const { resetOnboarding } = useOnboarding();

  const [settings, setSettings] = useState({
    clinic_name: "",
    session_duration: 50,
    session_price: 0,
    reminder_hours: 24,
    enable_whatsapp: false,
    enable_email: true,
    enable_sms: false,
    primary_color: "#9b87f5",
    terms_of_service: "",
    privacy_policy: "",
  });

  useEffect(() => { checkAuthAndLoadData(); }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileData) {
      setProfile(profileData);
      setSettings(prev => ({
        ...prev,
        clinic_name: profileData.clinic_name || "",
      }));
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    toast.info("Configurações serão salvas após a atualização do banco de dados");
    setSaving(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("profiles").update({
      full_name: formData.get("name") as string,
      crp: formData.get("crp") as string,
      phone: formData.get("phone") as string,
      specialty: formData.get("specialty") as string,
      clinic_name: formData.get("clinic_name") as string,
    }).eq("id", user.id);

    setSaving(false);
    if (error) { toast.error("Erro ao atualizar perfil"); return; }
    toast.success("Perfil atualizado com sucesso!");
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) { toast.error("Erro ao alterar senha"); return; }
    toast.success("Senha alterada com sucesso!");
    (e.target as HTMLFormElement).reset();
  };

  const handleLogoutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/auth";
  };

  const selectedModuleCount = Object.values(exportModules).filter(Boolean).length;

  const handleExportBackup = useCallback(async () => {
    if (!exportPassword || exportPassword.length < 4) {
      toast.error("Digite uma senha com pelo menos 4 caracteres");
      return;
    }
    if (selectedModuleCount === 0) {
      toast.error("Selecione pelo menos um módulo para exportar");
      return;
    }

    setExporting(true);
    setExportDialogOpen(false);
    setExportProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fetches: (() => PromiseLike<any>)[] = [];
      const fetchKeys: string[] = [];

      if (exportModules.patients) {
        fetches.push(() => supabase.from("patients").select("*").is("deleted_at", null));
        fetchKeys.push("patients");
      }
      if (exportModules.appointments) {
        fetches.push(() => supabase.from("appointments").select("*, patients(full_name)").is("deleted_at", null));
        fetchKeys.push("appointments");
      }
      if (exportModules.financial) {
        fetches.push(() => supabase.from("financial_transactions").select("*, patients(full_name)").is("deleted_at", null));
        fetchKeys.push("financial");
      }
      if (exportModules.records) {
        fetches.push(() => supabase.from("medical_records").select("*, patients(full_name)").is("deleted_at", null));
        fetchKeys.push("records");
      }

      setExportProgress(30);
      const results = await Promise.all(fetches.map(fn => fn()));
      setExportProgress(60);

      const dataMap: Record<string, any[]> = {};
      fetchKeys.forEach((key, i) => { dataMap[key] = (results[i] as any).data || []; });

      const patients = (dataMap.patients || []).map(p => ({
        nome: p.full_name, email: p.email || "", telefone: p.phone || "",
        cpf: p.cpf || "", nascimento: p.birth_date || "", status: p.status,
        endereco: p.address || "", valor_sessao: p.default_session_value || "",
        dia_pagamento: p.payment_day || "", plano_mensal: p.monthly_plan_value || "",
        observacoes: p.notes || "",
      }));

      const appointments = (dataMap.appointments || []).map((a: any) => ({
        paciente: a.patients?.full_name || "", data: a.scheduled_at?.split("T")[0] || "",
        horario: a.scheduled_at ? new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
        status: a.status, tipo: a.type, duracao: `${a.duration_minutes || 50}min`,
        valor: a.session_value || 0, observacoes: a.notes || "",
      }));

      const financial = (dataMap.financial || []).map((t: any) => ({
        descricao: t.description || "", tipo: t.type === "income" ? "Receita" : "Despesa",
        valor: t.amount, status: t.status, paciente: t.patients?.full_name || "",
        categoria: t.category || "", vencimento: t.due_date || "", pagamento: t.paid_date || "",
        metodo: t.payment_method || "",
      }));

      const records = (dataMap.records || []).map((r: any) => ({
        paciente: r.patients?.full_name || "", data_sessao: r.session_date,
        numero_sessao: r.session_number || "", queixas: r.complaints || "",
        evolucao: r.evolution || "", tecnicas: r.techniques_used || "",
        proximos_passos: r.next_steps || "", observacoes: r.observations || "",
      }));

      setExportProgress(80);
      const dateStr = new Date().toISOString().split("T")[0];

      if (exportFormat === "xlsx") {
        const sheets: { name: string; data: any[] }[] = [];
        if (exportModules.patients) sheets.push({ name: "Pacientes", data: patients });
        if (exportModules.appointments) sheets.push({ name: "Agendamentos", data: appointments });
        if (exportModules.financial) sheets.push({ name: "Financeiro", data: financial });
        if (exportModules.records) sheets.push({ name: "Prontuários", data: records });
        exportMultiSheetExcel(sheets, `psicoone-backup-${dateStr}`);
      } else if (exportFormat === "json") {
        const jsonData: Record<string, any> = {
          metadata: { version: "1.0", exportedAt: new Date().toISOString(), appVersion: "2.0" },
        };
        if (exportModules.patients) jsonData.pacientes = patients;
        if (exportModules.appointments) jsonData.agendamentos = appointments;
        if (exportModules.financial) jsonData.financeiro = financial;
        if (exportModules.records) jsonData.prontuarios = records;

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `psicoone-backup-${dateStr}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "csv") {
        // Export each module as separate CSV
        if (exportModules.patients && patients.length) exportToCSV(patients, `pacientes-${dateStr}`);
        if (exportModules.appointments && appointments.length) exportToCSV(appointments, `agendamentos-${dateStr}`);
        if (exportModules.financial && financial.length) exportToCSV(financial, `financeiro-${dateStr}`);
        if (exportModules.records && records.length) exportToCSV(records, `prontuarios-${dateStr}`);
      }

      setExportProgress(95);

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "full_export",
        entity_type: "system",
        new_data: {
          format: exportFormat,
          modules: Object.entries(exportModules).filter(([, v]) => v).map(([k]) => k),
          patients_count: patients.length,
          appointments_count: appointments.length,
          financial_count: financial.length,
          records_count: records.length,
        },
      } as any);

      setExportProgress(100);
      toast.success("Backup exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar dados");
      console.error(err);
    } finally {
      setTimeout(() => { setExporting(false); setExportProgress(0); }, 1000);
      setExportPassword("");
    }
  }, [exportPassword, exportFormat, exportModules, selectedModuleCount]);

  // ── IMPORT / RESTORE ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Apenas arquivos .json exportados pelo PsicoOne são suportados");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Detect modules present
      const detected: Record<string, any[]> = {};
      if (Array.isArray(parsed.pacientes)) detected.patients = parsed.pacientes;
      if (Array.isArray(parsed.prontuarios)) detected.records = parsed.prontuarios;
      if (Array.isArray(parsed.agendamentos)) detected.appointments = parsed.agendamentos;
      if (Array.isArray(parsed.financeiro)) detected.financial = parsed.financeiro;

      if (Object.keys(detected).length === 0) {
        toast.error("Nenhum dado reconhecido no arquivo. Use um backup gerado pelo PsicoOne.");
        return;
      }

      setImportFile(file);
      setImportData(detected);
      setImportModules({
        patients: !!detected.patients,
        records: !!detected.records,
        appointments: !!detected.appointments,
        financial: !!detected.financial,
      });
      toast.success("Arquivo lido com sucesso! Revise os dados abaixo.");
    } catch {
      toast.error("Erro ao ler o arquivo. Verifique se é um JSON válido.");
    }
  }, []);

  const handleImportRestore = useCallback(async () => {
    if (!importData) return;
    setImporting(true);
    setImportDialogOpen(false);
    setImportProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let totalInserted = 0;
      const steps = Object.entries(importModules).filter(([, v]) => v);
      const stepSize = 80 / Math.max(steps.length, 1);

      for (let i = 0; i < steps.length; i++) {
        const [moduleKey] = steps[i];
        const rows = importData[moduleKey];
        if (!rows || rows.length === 0) continue;

        setImportProgress(10 + Math.round(stepSize * i));

        if (moduleKey === "patients" && importModules.patients) {
          for (const p of rows) {
            if (importStrategy === "skip") {
              // Check if patient already exists by name
              const { data: existing } = await supabase.from("patients")
                .select("id").eq("full_name", p.nome).eq("psychologist_id", user.id).is("deleted_at", null).limit(1);
              if (existing && existing.length > 0) continue;
            }
            await supabase.from("patients").insert({
              psychologist_id: user.id,
              full_name: p.nome || "Sem nome",
              email: p.email || null,
              phone: p.telefone || null,
              cpf: p.cpf || null,
              birth_date: p.nascimento || null,
              status: p.status || "active",
              address: p.endereco || null,
              notes: p.observacoes || null,
              default_session_value: p.valor_sessao || null,
              payment_day: p.dia_pagamento || null,
              monthly_plan_value: p.plano_mensal || null,
            } as any);
            totalInserted++;
          }
        }

        if (moduleKey === "records" && importModules.records) {
          for (const r of rows) {
            // Find patient by name
            const { data: pat } = await supabase.from("patients")
              .select("id").eq("full_name", r.paciente).eq("psychologist_id", user.id).is("deleted_at", null).limit(1);
            if (!pat || pat.length === 0) continue;

            await supabase.from("medical_records").insert({
              psychologist_id: user.id,
              patient_id: pat[0].id,
              session_date: r.data_sessao || new Date().toISOString().split("T")[0],
              session_number: r.numero_sessao || null,
              complaints: r.queixas || null,
              evolution: r.evolucao || null,
              techniques_used: r.tecnicas || null,
              next_steps: r.proximos_passos || null,
              observations: r.observacoes || null,
            } as any);
            totalInserted++;
          }
        }

        if (moduleKey === "appointments" && importModules.appointments) {
          for (const a of rows) {
            const { data: pat } = await supabase.from("patients")
              .select("id").eq("full_name", a.paciente).eq("psychologist_id", user.id).is("deleted_at", null).limit(1);
            if (!pat || pat.length === 0) continue;

            await supabase.from("appointments").insert({
              psychologist_id: user.id,
              patient_id: pat[0].id,
              scheduled_at: a.data && a.horario ? `${a.data}T${a.horario}:00` : new Date().toISOString(),
              status: a.status || "scheduled",
              type: a.tipo || "presential",
              session_value: a.valor || 200,
              notes: a.observacoes || null,
            } as any);
            totalInserted++;
          }
        }

        if (moduleKey === "financial" && importModules.financial) {
          for (const t of rows) {
            const { data: pat } = await supabase.from("patients")
              .select("id").eq("full_name", t.paciente).eq("psychologist_id", user.id).is("deleted_at", null).limit(1);
            if (!pat || pat.length === 0) continue;

            await supabase.from("financial_transactions").insert({
              psychologist_id: user.id,
              patient_id: pat[0].id,
              type: t.tipo === "Receita" ? "income" : "expense",
              amount: t.valor || 0,
              description: t.descricao || null,
              status: t.status || "pending",
              category: t.categoria || null,
              due_date: t.vencimento || null,
              paid_date: t.pagamento || null,
              payment_method: t.metodo || null,
            } as any);
            totalInserted++;
          }
        }
      }

      setImportProgress(95);

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "data_import",
        entity_type: "system",
        new_data: {
          file_name: importFile?.name,
          strategy: importStrategy,
          modules: Object.entries(importModules).filter(([, v]) => v).map(([k]) => k),
          total_inserted: totalInserted,
        },
      } as any);

      setImportProgress(100);
      toast.success(`${totalInserted} registro(s) importado(s) com sucesso!`);
      setImportFile(null);
      setImportData(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar dados. Verifique o console.");
    } finally {
      setTimeout(() => { setImporting(false); setImportProgress(0); }, 1000);
    }
  }, [importData, importModules, importStrategy, importFile]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <AppLayout title="Configurações" description="Personalize seu sistema">
      <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar h-auto flex-wrap sm:flex-nowrap gap-1 p-1">
          <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <User className="h-3.5 w-3.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Plug className="h-3.5 w-3.5" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Bell className="h-3.5 w-3.5" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Palette className="h-3.5 w-3.5" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Shield className="h-3.5 w-3.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <FileText className="h-3.5 w-3.5" /> Termos
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Package className="h-3.5 w-3.5" /> Backup
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <HelpCircle className="h-3.5 w-3.5" /> Ajuda
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Informações Profissionais
              </CardTitle>
              <CardDescription>Configure seus dados e da clínica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" defaultValue={profile?.full_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crp">CRP</Label>
                    <Input id="crp" name="crp" defaultValue={profile?.crp} placeholder="00/00000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" defaultValue={profile?.phone} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input id="specialty" name="specialty" defaultValue={profile?.specialty} placeholder="Ex: Psicologia Clínica" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label htmlFor="clinic_name">Nome da Clínica</Label>
                    <Input id="clinic_name" name="clinic_name" defaultValue={profile?.clinic_name || ""} placeholder="Nome do consultório ou clínica" />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label htmlFor="preferred_clinical_style">Abordagem Clínica</Label>
                    <Select name="preferred_clinical_style" defaultValue={profile?.preferred_clinical_style || "neutral"}>
                      <SelectTrigger id="preferred_clinical_style">
                        <SelectValue placeholder="Selecione sua abordagem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutro / Genérico</SelectItem>
                        <SelectItem value="tcc">Cognitivo-Comportamental (TCC)</SelectItem>
                        <SelectItem value="psychoanalysis">Psicanálise</SelectItem>
                        <SelectItem value="phenomenological">Fenomenológica Existencial</SelectItem>
                        <SelectItem value="humanistic">Humanista</SelectItem>
                        <SelectItem value="systemic">Sistêmica</SelectItem>
                        <SelectItem value="gestalt">Gestalt-terapia</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Usada pela IA para adaptar resumos e prontuários ao seu estilo clínico</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_duration">Duração da Sessão (min)</Label>
                    <Input id="session_duration" type="number" value={settings.session_duration} onChange={(e) => setSettings({ ...settings, session_duration: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session_price">Valor da Sessão (R$)</Label>
                    <Input id="session_price" type="number" step="0.01" value={settings.session_price} onChange={(e) => setSettings({ ...settings, session_price: Number(e.target.value) })} />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="gap-2 w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INTEGRATIONS ── */}
        <TabsContent value="integrations">
          <GoogleCalendarSettings />
        </TabsContent>

        {/* ── NOTIFICATIONS ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Configurações de Notificações
              </CardTitle>
              <CardDescription>Configure como deseja notificar seus pacientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "enable_email" as const, label: "Email", desc: "Enviar notificações por email" },
                { key: "enable_whatsapp" as const, label: "WhatsApp", desc: "Enviar lembretes via WhatsApp" },
                { key: "enable_sms" as const, label: "SMS", desc: "Enviar notificações por SMS" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label>{label}</Label>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={settings[key]} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })} />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="reminder_hours">Antecedência dos Lembretes (horas)</Label>
                <Input id="reminder_hours" type="number" value={settings.reminder_hours} onChange={(e) => setSettings({ ...settings, reminder_hours: Number(e.target.value) })} />
                <p className="text-sm text-muted-foreground">Pacientes receberão lembretes com esta antecedência</p>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── APPEARANCE ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" /> Personalização Visual
              </CardTitle>
              <CardDescription>Customize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Principal</Label>
                <div className="flex gap-4 mt-2">
                  <Input id="primary_color" type="color" value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="w-20 h-10" />
                  <Input value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Aparência"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECURITY ── */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" /> Alterar Senha
                </CardTitle>
                <CardDescription>Atualize sua senha de acesso ao sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input id="new_password" name="new_password" type="password" placeholder="Mínimo 6 caracteres" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Senha</Label>
                    <Input id="confirm_password" name="confirm_password" type="password" placeholder="Repita a nova senha" required />
                  </div>
                  <Button type="submit" disabled={saving} className="gap-2 w-full sm:w-auto">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-destructive" /> Sessões Ativas
                </CardTitle>
                <CardDescription>Encerre todas as sessões ativas em outros dispositivos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Isso fará logout de todos os dispositivos, incluindo este. Você precisará fazer login novamente.
                </p>
                <Button variant="destructive" onClick={handleLogoutAll} className="gap-2 w-full sm:w-auto">
                  <LogOut className="h-4 w-4" /> Encerrar Todas as Sessões
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── LEGAL ── */}
        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Termos e Políticas
              </CardTitle>
              <CardDescription>Configure os termos de uso e políticas de privacidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="terms_of_service">Termos de Uso</Label>
                <Textarea id="terms_of_service" value={settings.terms_of_service} onChange={(e) => setSettings({ ...settings, terms_of_service: e.target.value })} rows={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy_policy">Política de Privacidade</Label>
                <Textarea id="privacy_policy" value={settings.privacy_policy} onChange={(e) => setSettings({ ...settings, privacy_policy: e.target.value })} rows={6} />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Políticas"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BACKUP & EXPORT ── */}
        <TabsContent value="export">
          <div className="space-y-6">
            {/* Header card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Backup & Exportação</CardTitle>
                    <CardDescription>Exporte seus dados com controle total sobre o que incluir</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Module selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Selecione os dados para exportar</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "patients" as const, label: "Pacientes", desc: "Cadastro completo, contatos, valores", icon: "👤" },
                      { key: "records" as const, label: "Prontuários", desc: "Sessões, evoluções e observações", icon: "📋" },
                      { key: "appointments" as const, label: "Agendamentos", desc: "Histórico completo de sessões", icon: "📅" },
                      { key: "financial" as const, label: "Financeiro", desc: "Receitas, despesas e pagamentos", icon: "💰" },
                    ].map(({ key, label, desc, icon }) => (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          exportModules[key]
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Checkbox
                          checked={exportModules[key]}
                          onCheckedChange={(checked) =>
                            setExportModules(prev => ({ ...prev, [key]: !!checked }))
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span>{icon}</span>
                            <span className="font-medium text-sm">{label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Format selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Formato de exportação</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "xlsx" as const, label: "Excel", desc: "Multi-abas", icon: FileSpreadsheet },
                      { value: "json" as const, label: "JSON", desc: "Estruturado", icon: FileJson },
                      { value: "csv" as const, label: "CSV", desc: "Por módulo", icon: FileArchive },
                    ].map(({ value, label, desc, icon: Icon }) => (
                      <label
                        key={value}
                        className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border cursor-pointer transition-all text-center ${
                          exportFormat === value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportFormat"
                          value={value}
                          checked={exportFormat === value}
                          onChange={() => setExportFormat(value)}
                          className="sr-only"
                        />
                        <Icon className={`h-5 w-5 ${exportFormat === value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-medium text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Security warning */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Esta ação exporta dados sensíveis. O download será registrado nos logs de auditoria.
                  </p>
                </div>

                {/* Export progress */}
                {exporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Gerando backup...</span>
                      <span className="font-medium">{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} className="h-2" />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="gap-2 flex-1"
                    onClick={() => setExportDialogOpen(true)}
                    disabled={exporting || selectedModuleCount === 0}
                  >
                    {exporting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Exportando...</>
                      : <><Download className="h-4 w-4" /> Exportar {selectedModuleCount === 4 ? "Backup Completo" : `${selectedModuleCount} Módulo${selectedModuleCount > 1 ? "s" : ""}`}</>
                    }
                  </Button>
                  {selectedModuleCount < 4 && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setExportModules({ patients: true, records: true, appointments: true, financial: true })}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Selecionar Tudo
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── IMPORT / RESTORE CARD ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/10">
                    <Upload className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle>Importar / Restaurar Backup</CardTitle>
                    <CardDescription>Restaure dados a partir de um arquivo JSON exportado pelo PsicoOne</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File upload */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Selecionar arquivo</Label>
                  <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-muted/20">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {importFile ? importFile.name : "Clique para selecionar um arquivo .json"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas arquivos JSON exportados pelo PsicoOne
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Detected data summary */}
                {importData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-medium">
                        Backup reconhecido — selecione o que deseja restaurar
                      </p>
                    </div>

                    {/* Module selection with counts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        { key: "patients" as const, label: "Pacientes", icon: "👤" },
                        { key: "records" as const, label: "Prontuários", icon: "📋" },
                        { key: "appointments" as const, label: "Agendamentos", icon: "📅" },
                        { key: "financial" as const, label: "Financeiro", icon: "💰" },
                      ] as const).map(({ key, label, icon }) => {
                        const rows = importData[key];
                        if (!rows) return null;
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              importModules[key]
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/30"
                            }`}
                          >
                            <Checkbox
                              checked={importModules[key]}
                              onCheckedChange={(checked) =>
                                setImportModules(prev => ({ ...prev, [key]: !!checked }))
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span>{icon}</span>
                                <span className="font-medium text-sm">{label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rows.length} registro{rows.length !== 1 ? "s" : ""} encontrado{rows.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Strategy */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Estratégia de importação</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            importStrategy === "skip"
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <input type="radio" name="importStrategy" value="skip" checked={importStrategy === "skip"} onChange={() => setImportStrategy("skip")} className="sr-only" />
                          <span className="font-medium text-sm">Ignorar duplicados</span>
                          <span className="text-xs text-muted-foreground">Pula registros que já existem (mais seguro)</span>
                        </label>
                        <label
                          className={`flex flex-col gap-1 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            importStrategy === "replace"
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <input type="radio" name="importStrategy" value="replace" checked={importStrategy === "replace"} onChange={() => setImportStrategy("replace")} className="sr-only" />
                          <span className="font-medium text-sm">Importar tudo</span>
                          <span className="text-xs text-muted-foreground">Insere todos os registros (pode duplicar)</span>
                        </label>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">
                        A importação é irreversível. Certifique-se de que o arquivo é confiável antes de continuar.
                      </p>
                    </div>

                    {/* Import progress */}
                    {importing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Importando dados...</span>
                          <span className="font-medium">{importProgress}%</span>
                        </div>
                        <Progress value={importProgress} className="h-2" />
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        className="gap-2 flex-1"
                        onClick={() => setImportDialogOpen(true)}
                        disabled={importing || !Object.values(importModules).some(Boolean)}
                      >
                        {importing
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                          : <><RotateCcw className="h-4 w-4" /> Restaurar Dados</>
                        }
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setImportFile(null); setImportData(null); }}
                        disabled={importing}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── HELP ── */}
        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" /> Central de Ajuda
              </CardTitle>
              <CardDescription>Recursos para ajudá-lo a usar o PsicoOne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <h4 className="font-medium mb-2">🎓 Guia do Sistema</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Reveja o tour interativo que apresenta todas as funcionalidades do PsicoOne.
                </p>
                <Button onClick={() => { resetOnboarding(); window.location.href = "/dashboard"; }} className="gap-2 w-full sm:w-auto">
                  <HelpCircle className="h-4 w-4" /> Ver guia do sistema novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export password dialog */}
      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Confirmar Exportação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Digite sua senha para confirmar a exportação. Esta ação será registrada nos logs de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p className="font-medium">Resumo da exportação:</p>
              <p className="text-muted-foreground">
                {Object.entries(exportModules).filter(([, v]) => v).map(([k]) => {
                  const labels: Record<string, string> = { patients: "Pacientes", records: "Prontuários", appointments: "Agendamentos", financial: "Financeiro" };
                  return labels[k];
                }).join(", ")} • Formato: {exportFormat.toUpperCase()}
              </p>
            </div>
            <div>
              <Label htmlFor="export_password">Senha de confirmação</Label>
              <Input
                id="export_password"
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Digite qualquer senha para confirmar"
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExportPassword("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExportBackup} disabled={!exportPassword || exportPassword.length < 4}>
              Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import confirmation dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> Confirmar Importação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja importar os dados selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p className="font-medium">Resumo da importação:</p>
              <p className="text-muted-foreground">
                {Object.entries(importModules).filter(([, v]) => v).map(([k]) => {
                  const labels: Record<string, string> = { patients: "Pacientes", records: "Prontuários", appointments: "Agendamentos", financial: "Financeiro" };
                  const count = importData?.[k]?.length || 0;
                  return `${labels[k]} (${count})`;
                }).join(", ")}
              </p>
              <p className="text-muted-foreground">
                Estratégia: {importStrategy === "skip" ? "Ignorar duplicados" : "Importar tudo"}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportRestore}>
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
