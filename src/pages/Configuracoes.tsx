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
import { Save, Building2, Bell, Palette, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
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

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    toast.info("Configurações serão salvas após a atualização do banco de dados");
    setSaving(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.get("name") as string,
        crp: formData.get("crp") as string,
        phone: formData.get("phone") as string,
        specialty: formData.get("specialty") as string,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao atualizar perfil");
      return;
    }

    toast.success("Perfil atualizado com sucesso!");
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <FileText className="h-4 w-4" />
            Termos
          </TabsTrigger>
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
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" name="name" defaultValue={profile?.full_name} required />
                  </div>
                  <div>
                    <Label htmlFor="crp">CRP</Label>
                    <Input id="crp" name="crp" defaultValue={profile?.crp} placeholder="00/00000" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" defaultValue={profile?.phone} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input id="specialty" name="specialty" defaultValue={profile?.specialty} placeholder="Ex: Psicologia Clínica" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="clinic_name">Nome da Clínica</Label>
                    <Input
                      id="clinic_name"
                      value={settings.clinic_name}
                      onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                      placeholder="Digite o nome da sua clínica"
                    />
                  </div>
                  <div>
                    <Label htmlFor="session_duration">Duração da Sessão (min)</Label>
                    <Input
                      id="session_duration"
                      type="number"
                      value={settings.session_duration}
                      onChange={(e) => setSettings({ ...settings, session_duration: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="session_price">Valor da Sessão (R$)</Label>
                    <Input
                      id="session_price"
                      type="number"
                      step="0.01"
                      value={settings.session_price}
                      onChange={(e) => setSettings({ ...settings, session_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Perfil
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>Configure como deseja notificar seus pacientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificações por email</p>
                </div>
                <Switch
                  checked={settings.enable_email}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Enviar lembretes via WhatsApp</p>
                </div>
                <Switch
                  checked={settings.enable_whatsapp}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_whatsapp: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificações por SMS</p>
                </div>
                <Switch
                  checked={settings.enable_sms}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_sms: checked })}
                />
              </div>
              <div>
                <Label htmlFor="reminder_hours">Antecedência dos Lembretes (horas)</Label>
                <Input
                  id="reminder_hours"
                  type="number"
                  value={settings.reminder_hours}
                  onChange={(e) => setSettings({ ...settings, reminder_hours: Number(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Pacientes receberão lembretes com esta antecedência
                </p>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Personalização Visual</CardTitle>
              <CardDescription>Customize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="primary_color">Cor Principal</Label>
                <div className="flex gap-4 mt-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Aparência"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>Termos e Políticas</CardTitle>
              <CardDescription>Configure os termos de uso e políticas de privacidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="terms_of_service">Termos de Uso</Label>
                <Textarea
                  id="terms_of_service"
                  value={settings.terms_of_service}
                  onChange={(e) => setSettings({ ...settings, terms_of_service: e.target.value })}
                  placeholder="Digite os termos de uso..."
                  rows={6}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="privacy_policy">Política de Privacidade</Label>
                <Textarea
                  id="privacy_policy"
                  value={settings.privacy_policy}
                  onChange={(e) => setSettings({ ...settings, privacy_policy: e.target.value })}
                  placeholder="Digite a política de privacidade..."
                  rows={6}
                  className="mt-2"
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Políticas"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
