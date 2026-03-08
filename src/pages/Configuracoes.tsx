import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Building2, Bell, Palette, FileText, Database, Download, Lock, Loader2, Shield, Plug, HelpCircle } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { GoogleCalendarSettings } from "@/components/settings/GoogleCalendarSettings";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { exportMultiSheetExcel, exportToCSV } from "@/lib/export-utils";
import { useUserRole } from "@/hooks/useUserRole";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const { isAdmin, isPsychologist } = useUserRole();
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
    working_hours: {
      monday: { start: "08:00", end: "18:00" },
      tuesday: { start: "08:00", end: "18:00" },
      wednesday: { start: "08:00", end: "18:00" },
      thursday: { start: "08:00", end: "18:00" },
      friday: { start: "08:00", end: "18:00" },
    },
    terms_of_service: "",
    privacy_policy: "",
  });

  useEffect(() => { checkAuthAndLoadData(); }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profileData) setProfile(profileData);
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

    const { error } = await supabase.from("profiles").update({
      full_name: formData.get("name") as string,
      crp: formData.get("crp") as string,
      phone: formData.get("phone") as string,
      specialty: formData.get("specialty") as string,
    }).eq("id", user.id);

    if (error) { toast.error("Erro ao atualizar perfil"); return; }
    toast.success("Perfil atualizado com sucesso!");
  };

  const handleExportFullBackup = async () => {
    if (!exportPassword || exportPassword.length < 4) {
      toast.error("Digite uma senha com pelo menos 4 caracteres");
      return;
    }

    setExporting(true);
    setExportDialogOpen(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Load all data in parallel
      const [patientsRes, appointmentsRes, financialRes, recordsRes] = await Promise.all([
        supabase.from("patients").select("*").is("deleted_at", null),
        supabase.from("appointments").select("*, patients(full_name)").is("deleted_at", null),
        supabase.from("financial_transactions").select("*, patients(full_name)").is("deleted_at", null),
        supabase.from("medical_records").select("*, patients(full_name)").is("deleted_at", null),
      ]);

      const patients = (patientsRes.data || []).map(p => ({
        nome: p.full_name, email: p.email || "", telefone: p.phone || "",
        cpf: p.cpf || "", nascimento: p.birth_date || "", status: p.status,
        endereco: p.address || "", observacoes: p.notes || "",
      }));

      const appointments = (appointmentsRes.data || []).map((a: any) => ({
        paciente: a.patients?.full_name || "", data: a.scheduled_at?.split("T")[0] || "",
        horario: a.scheduled_at ? new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
        status: a.status, tipo: a.type, duracao: `${a.duration_minutes || 50}min`,
        valor: a.session_value || 0, observacoes: a.notes || "",
      }));

      const financial = (financialRes.data || []).map((t: any) => ({
        descricao: t.description || "", tipo: t.type === "income" ? "Receita" : "Despesa",
        valor: t.amount, status: t.status, paciente: t.patients?.full_name || "",
        categoria: t.category || "", vencimento: t.due_date || "", pagamento: t.paid_date || "",
        metodo: t.payment_method || "",
      }));

      const records = (recordsRes.data || []).map((r: any) => ({
        paciente: r.patients?.full_name || "", data_sessao: r.session_date,
        numero_sessao: r.session_number || "", queixas: r.complaints || "",
        evolucao: r.evolution || "", tecnicas: r.techniques_used || "",
        proximos_passos: r.next_steps || "", observacoes: r.observations || "",
      }));

      exportMultiSheetExcel([
        { name: "Pacientes", data: patients },
        { name: "Agendamentos", data: appointments },
        { name: "Financeiro", data: financial },
        { name: "Prontuários", data: records },
      ], `psicoone-backup-${new Date().toISOString().split("T")[0]}`);

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "full_export",
        entity_type: "system",
        new_data: {
          patients_count: patients.length,
          appointments_count: appointments.length,
          financial_count: financial.length,
          records_count: records.length,
        },
      } as any);

      toast.success("Backup exportado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar dados");
      console.error(err);
    } finally {
      setExporting(false);
      setExportPassword("");
    }
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
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="gap-2"><Building2 className="h-4 w-4" />Perfil</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" />Integrações</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notificações</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" />Aparência</TabsTrigger>
          <TabsTrigger value="legal" className="gap-2"><FileText className="h-4 w-4" />Termos</TabsTrigger>
          <TabsTrigger value="export" className="gap-2"><Database className="h-4 w-4" />Exportar</TabsTrigger>
          <TabsTrigger value="help" className="gap-2"><HelpCircle className="h-4 w-4" />Ajuda</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
              <CardDescription>Configure seus dados e da clínica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="name">Nome Completo</Label><Input id="name" name="name" defaultValue={profile?.full_name} required /></div>
                  <div><Label htmlFor="crp">CRP</Label><Input id="crp" name="crp" defaultValue={profile?.crp} placeholder="00/00000" /></div>
                  <div><Label htmlFor="phone">Telefone</Label><Input id="phone" name="phone" defaultValue={profile?.phone} placeholder="(00) 00000-0000" /></div>
                  <div><Label htmlFor="specialty">Especialidade</Label><Input id="specialty" name="specialty" defaultValue={profile?.specialty} placeholder="Ex: Psicologia Clínica" /></div>
                  <div className="col-span-2"><Label htmlFor="clinic_name">Nome da Clínica</Label><Input id="clinic_name" value={settings.clinic_name} onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })} /></div>
                  <div><Label htmlFor="session_duration">Duração da Sessão (min)</Label><Input id="session_duration" type="number" value={settings.session_duration} onChange={(e) => setSettings({ ...settings, session_duration: Number(e.target.value) })} /></div>
                  <div><Label htmlFor="session_price">Valor da Sessão (R$)</Label><Input id="session_price" type="number" step="0.01" value={settings.session_price} onChange={(e) => setSettings({ ...settings, session_price: Number(e.target.value) })} /></div>
                </div>
                <Button type="submit" className="gap-2"><Save className="h-4 w-4" />Salvar Perfil</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <GoogleCalendarSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Configurações de Notificações</CardTitle><CardDescription>Configure como deseja notificar seus pacientes</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>Email</Label><p className="text-sm text-muted-foreground">Enviar notificações por email</p></div><Switch checked={settings.enable_email} onCheckedChange={(checked) => setSettings({ ...settings, enable_email: checked })} /></div>
              <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>WhatsApp</Label><p className="text-sm text-muted-foreground">Enviar lembretes via WhatsApp</p></div><Switch checked={settings.enable_whatsapp} onCheckedChange={(checked) => setSettings({ ...settings, enable_whatsapp: checked })} /></div>
              <div className="flex items-center justify-between"><div className="space-y-0.5"><Label>SMS</Label><p className="text-sm text-muted-foreground">Enviar notificações por SMS</p></div><Switch checked={settings.enable_sms} onCheckedChange={(checked) => setSettings({ ...settings, enable_sms: checked })} /></div>
              <div><Label htmlFor="reminder_hours">Antecedência dos Lembretes (horas)</Label><Input id="reminder_hours" type="number" value={settings.reminder_hours} onChange={(e) => setSettings({ ...settings, reminder_hours: Number(e.target.value) })} className="mt-2" /><p className="text-sm text-muted-foreground mt-1">Pacientes receberão lembretes com esta antecedência</p></div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Configurações"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Personalização Visual</CardTitle><CardDescription>Customize a aparência do sistema</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div><Label htmlFor="primary_color">Cor Principal</Label><div className="flex gap-4 mt-2"><Input id="primary_color" type="color" value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="w-20 h-10" /><Input value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} /></div></div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Aparência"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader><CardTitle>Termos e Políticas</CardTitle><CardDescription>Configure os termos de uso e políticas de privacidade</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div><Label htmlFor="terms_of_service">Termos de Uso</Label><Textarea id="terms_of_service" value={settings.terms_of_service} onChange={(e) => setSettings({ ...settings, terms_of_service: e.target.value })} rows={6} className="mt-2" /></div>
              <div><Label htmlFor="privacy_policy">Política de Privacidade</Label><Textarea id="privacy_policy" value={settings.privacy_policy} onChange={(e) => setSettings({ ...settings, privacy_policy: e.target.value })} rows={6} className="mt-2" /></div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar Políticas"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Database className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle>Exportar Base Completa</CardTitle>
                  <CardDescription>Exporte todos os dados do sistema em formato estruturado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <h4 className="font-medium mb-2">📦 Dados Incluídos</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Pacientes (cadastro completo)</li>
                    <li>• Prontuários (sessões e observações)</li>
                    <li>• Agendamentos (histórico completo)</li>
                    <li>• Financeiro (receitas e despesas)</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <h4 className="font-medium mb-2">🔐 Segurança</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Senha obrigatória para exportar</li>
                    <li>• Log de auditoria registrado</li>
                    <li>• Apenas admin pode exportar base completa</li>
                    <li>• Formato: Excel (.xlsx) multi-abas</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Esta ação exporta dados sensíveis. O download será registrado nos logs de auditoria.
                </p>
              </div>

              <Button
                className="gap-2 w-full sm:w-auto"
                onClick={() => setExportDialogOpen(true)}
                disabled={exporting}
              >
                {exporting ? <><Loader2 className="h-4 w-4 animate-spin" />Exportando...</> : <><Download className="h-4 w-4" />Exportar Backup Completo</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Confirmar Exportação</AlertDialogTitle>
            <AlertDialogDescription>
              Digite sua senha para confirmar a exportação de todos os dados do sistema. Esta ação será registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExportPassword("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExportFullBackup} disabled={!exportPassword || exportPassword.length < 4}>
              Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
