import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Globe, KeyRound,
  Loader2, MessageCircle, Phone, RefreshCw, Save, Send, ShieldCheck, Sparkles,
  Webhook, Zap, FileText, BarChart3, PowerOff, Power, Inbox, Circle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WaConfig {
  id: string;
  phone_number_id: string | null;
  access_token: string | null;
  verify_token: string | null;
  business_account_id: string | null;
  app_id: string | null;
  display_phone_number: string | null;
  business_name: string | null;
  webhook_subscribed: boolean;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  updated_at: string;
}

const PROJECT_ID = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || "jlnpehjlfwejwshvxwhs";
const WEBHOOK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

const QUALITY_COLORS: Record<string, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  YELLOW: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  RED: "bg-red-500/15 text-red-400 border-red-500/30",
  UNKNOWN: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const TPL_STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  PAUSED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function WhatsAppAdminPanel() {
  const [cfg, setCfg] = useState<WaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  // Test/listing states
  const [phoneInfo, setPhoneInfo] = useState<any>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Test send
  const [testTo, setTestTo] = useState("");
  const [testTpl, setTestTpl] = useState("hello_world");

  // Stats
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, failed: 0, last24h: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const EXPECTED_TEMPLATES = [
    "appointment_created", "appointment_reminder_24h", "appointment_reminder_1h",
    "appointment_rescheduled", "appointment_cancelled", "session_started",
  ];

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("whatsapp_config").select("*").maybeSingle();
    setCfg(data as WaConfig);
    setLoading(false);

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [{ count: total }, { count: sent }, { count: delivered }, { count: failed }, { count: last24h }] = await Promise.all([
      supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }),
      supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("status", "delivered"),
      supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    setStats({ total: total || 0, sent: sent || 0, delivered: delivered || 0, failed: failed || 0, last24h: last24h || 0 });

    const { data: logs } = await supabase.from("whatsapp_logs")
      .select("id, status, phone, template, created_at, error, body_preview")
      .order("created_at", { ascending: false }).limit(40);
    setRecentLogs(logs || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("wa_admin_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_logs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateField = (k: keyof WaConfig, v: any) => setCfg((c) => (c ? { ...c, [k]: v } : c));

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("whatsapp_config").update({
      phone_number_id: cfg.phone_number_id?.trim() || null,
      access_token: cfg.access_token?.trim() || null,
      verify_token: cfg.verify_token?.trim() || null,
      business_account_id: cfg.business_account_id?.trim() || null,
      app_id: cfg.app_id?.trim() || null,
      is_active: cfg.is_active,
      updated_by: session?.user?.id,
    }).eq("id", cfg.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Configurações salvas", description: "Credenciais WhatsApp atualizadas." });
      load();
    }
  };

  const callAdmin = async (action: string, payload: any = {}) => {
    setLoadingAction(action);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
        body: { action, ...payload },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
      return data;
    } catch (e: any) {
      const msg = e?.message || String(e);
      toast({ title: "Falhou", description: msg, variant: "destructive" });
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchPhoneInfo = async () => {
    const r = await callAdmin("phone_info");
    if (r) {
      setPhoneInfo(r.data);
      toast({ title: "📞 Conexão OK", description: r.data?.display_phone_number || "Número validado" });
      load();
    }
  };
  const fetchNumbers = async () => {
    const r = await callAdmin("list_phone_numbers");
    if (r) setPhoneNumbers(r.data || []);
  };
  const fetchTemplates = async () => {
    const r = await callAdmin("list_templates");
    if (r) setTemplates(r.data || []);
  };
  const fetchProfile = async () => {
    const r = await callAdmin("business_profile");
    if (r) setProfile(r.data);
  };
  const sendTest = async () => {
    if (!testTo) { toast({ title: "Informe um número", variant: "destructive" }); return; }
    const r = await callAdmin("send_test", { to: testTo, template: testTpl });
    if (r) toast({ title: "🚀 Mensagem enviada", description: `Status ${r.status}` });
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} copiado`, description: txt });
  };

  const usePhoneNumber = (n: any) => {
    updateField("phone_number_id", n.id);
    updateField("display_phone_number", n.display_phone_number);
    updateField("business_name", n.verified_name);
    toast({ title: "Número selecionado", description: `${n.display_phone_number} — clique em Salvar` });
  };

  const statusBadge = useMemo(() => {
    if (!cfg) return null;
    if (!cfg.is_active) return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Desativado</Badge>;
    if (cfg.last_test_status === "ok") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Operacional</Badge>;
    if (cfg.last_test_status === "failed") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><AlertTriangle className="h-3 w-3" /> Falha</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Não testado</Badge>;
  }, [cfg]);

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full bg-[hsl(222,47%,18%)]" /><Skeleton className="h-64 w-full bg-[hsl(222,47%,18%)]" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* HERO STATUS BANNER */}
      <Card className="relative overflow-hidden border-[hsl(222,47%,18%)] bg-gradient-to-br from-[hsl(142,71%,12%)] via-[hsl(222,47%,12%)] to-[hsl(222,47%,12%)] text-[hsl(0,0%,95%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(142,71%,45%/0.15),transparent_60%)] pointer-events-none" />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold tracking-tight">WhatsApp Business API</h2>
                  {statusBadge}
                </div>
                <p className="text-sm text-[hsl(220,9%,60%)]">
                  {cfg?.business_name ? `${cfg.business_name} · ` : ""}
                  {cfg?.display_phone_number || "Nenhum número conectado"}
                </p>
                {cfg?.last_tested_at && (
                  <p className="text-xs text-[hsl(220,9%,45%)] mt-1">
                    Último teste: {format(new Date(cfg.last_tested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {cfg.last_test_error && ` · ⚠ ${cfg.last_test_error}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(222,47%,16%)] border border-[hsl(222,47%,22%)]">
                {cfg?.is_active ? <Power className="h-4 w-4 text-emerald-400" /> : <PowerOff className="h-4 w-4 text-slate-500" />}
                <Label className="text-sm cursor-pointer">{cfg?.is_active ? "Ativo" : "Inativo"}</Label>
                <Switch checked={!!cfg?.is_active} onCheckedChange={(v) => updateField("is_active", v)} />
              </div>
              <Button onClick={fetchPhoneInfo} disabled={loadingAction === "phone_info"} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {loadingAction === "phone_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                Testar conexão
              </Button>
            </div>
          </div>

          {/* MINI STATS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
            {[
              { label: "Total", value: stats.total, color: "text-slate-300" },
              { label: "Enviadas", value: stats.sent, color: "text-blue-400" },
              { label: "Entregues", value: stats.delivered, color: "text-emerald-400" },
              { label: "Falhas", value: stats.failed, color: "text-red-400" },
              { label: "Últimas 24h", value: stats.last24h, color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-[hsl(222,47%,16%)]/60 border border-[hsl(222,47%,22%)] backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="bg-[hsl(222,47%,12%)] border border-[hsl(222,47%,18%)] p-1 h-auto flex-wrap">
          <TabsTrigger value="credentials" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><KeyRound className="h-4 w-4" />Credenciais</TabsTrigger>
          <TabsTrigger value="numbers" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Phone className="h-4 w-4" />Números</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Webhook className="h-4 w-4" />Webhook</TabsTrigger>
          <TabsTrigger value="test" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Send className="h-4 w-4" />Teste</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Sparkles className="h-4 w-4" />Perfil</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><Inbox className="h-4 w-4" />Logs ao vivo</TabsTrigger>
        </TabsList>

        {/* CREDENTIALS */}
        <TabsContent value="credentials">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" />Credenciais Meta Cloud API</CardTitle>
              <CardDescription className="text-[hsl(220,9%,55%)]">
                Configure as chaves do app WhatsApp Business. Dados criptografados e visíveis apenas para Super Admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Phone Number ID</Label>
                  <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={cfg?.phone_number_id || ""} onChange={(e) => updateField("phone_number_id", e.target.value)} placeholder="123456789012345" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">WhatsApp Business Account ID (WABA)</Label>
                  <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={cfg?.business_account_id || ""} onChange={(e) => updateField("business_account_id", e.target.value)} placeholder="987654321098765" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">App ID</Label>
                  <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={cfg?.app_id || ""} onChange={(e) => updateField("app_id", e.target.value)} placeholder="111122223333444" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Verify Token (Webhook)</Label>
                  <div className="relative">
                    <Input type={showVerify ? "text" : "password"} className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono pr-10" value={cfg?.verify_token || ""} onChange={(e) => updateField("verify_token", e.target.value)} placeholder="seu-token-secreto" />
                    <button type="button" onClick={() => setShowVerify(!showVerify)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(220,9%,55%)] hover:text-white">
                      {showVerify ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Access Token (Permanente)</Label>
                <div className="relative">
                  <Input type={showToken ? "text" : "password"} className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono pr-10" value={cfg?.access_token || ""} onChange={(e) => updateField("access_token", e.target.value)} placeholder="EAAxxxxxxxxxxxxxxx..." />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(220,9%,55%)] hover:text-white">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[hsl(220,9%,50%)]">💡 Use um System User Token (permanente) em produção. Tokens de usuário expiram em 60 dias.</p>
              </div>

              <Separator className="bg-[hsl(222,47%,18%)]" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={load} className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]"><RefreshCw className="h-4 w-4 mr-2" />Recarregar</Button>
                <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUMBERS */}
        <TabsContent value="numbers">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Phone className="h-5 w-5 text-emerald-400" />Números disponíveis na conta</CardTitle>
                <CardDescription className="text-[hsl(220,9%,55%)]">Listados diretamente da sua WABA. Clique em "Usar este número" para alternar.</CardDescription>
              </div>
              <Button onClick={fetchNumbers} disabled={loadingAction === "list_phone_numbers"} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {loadingAction === "list_phone_numbers" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {phoneNumbers.length === 0 ? (
                <p className="text-sm text-[hsl(220,9%,55%)] text-center py-10">Clique em Atualizar para carregar os números (requer WABA ID configurado).</p>
              ) : (
                <div className="grid gap-3">
                  {phoneNumbers.map((n) => {
                    const active = n.id === cfg?.phone_number_id;
                    return (
                      <div key={n.id} className={`p-4 rounded-lg border transition ${active ? "bg-emerald-500/10 border-emerald-500/40" : "bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)]"}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-lg font-semibold">{n.display_phone_number}</p>
                              {active && <Badge className="bg-emerald-500 text-white border-0">EM USO</Badge>}
                            </div>
                            <p className="text-sm text-[hsl(220,9%,60%)]">{n.verified_name || "Sem nome verificado"}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={QUALITY_COLORS[n.quality_rating || "UNKNOWN"]}>Qualidade: {n.quality_rating || "N/D"}</Badge>
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Tier: {n.messaging_limit_tier || "N/D"}</Badge>
                              <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 font-mono">{n.id}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => copy(n.id, "ID")} className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]"><Copy className="h-3 w-3" /></Button>
                            {!active && <Button size="sm" onClick={() => usePhoneNumber(n)} className="bg-emerald-600 hover:bg-emerald-700">Usar este número</Button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" />Templates aprovados</CardTitle>
                <CardDescription className="text-[hsl(220,9%,55%)]">Status real da Meta. Apenas templates APPROVED podem ser enviados.</CardDescription>
              </div>
              <Button onClick={fetchTemplates} disabled={loadingAction === "list_templates"} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {loadingAction === "list_templates" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-[hsl(220,9%,55%)] text-center py-10">Clique em Atualizar para listar templates da Meta.</p>
              ) : (
                <ScrollArea className="h-[480px] pr-3">
                  <div className="space-y-2">
                    {templates.map((t, i) => (
                      <div key={`${t.name}-${t.language}-${i}`} className="p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-mono text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-[hsl(220,9%,55%)]">{t.category} · {t.language}</p>
                          </div>
                          <Badge variant="outline" className={TPL_STATUS_COLORS[t.status] || "bg-slate-500/10 text-slate-400 border-slate-500/30"}>{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOK */}
        <TabsContent value="webhook">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-5 w-5 text-emerald-400" />Configuração do Webhook</CardTitle>
              <CardDescription className="text-[hsl(220,9%,55%)]">Cole estes valores em Meta Developers → WhatsApp → Configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Callback URL</Label>
                <div className="flex gap-2">
                  <Input readOnly className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono text-xs" value={WEBHOOK_URL} />
                  <Button onClick={() => copy(WEBHOOK_URL, "URL")} variant="outline" className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Verify Token</Label>
                <div className="flex gap-2">
                  <Input readOnly className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono text-xs" value={cfg?.verify_token || "(definir em Credenciais)"} />
                  <Button onClick={() => cfg?.verify_token && copy(cfg.verify_token, "Token")} variant="outline" className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]"><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                <p className="text-sm font-semibold text-blue-300 flex items-center gap-2"><Globe className="h-4 w-4" />Campos a inscrever:</p>
                <div className="flex flex-wrap gap-2">
                  {["messages", "message_template_status_update", "account_update", "phone_number_quality_update"].map((f) => (
                    <Badge key={f} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 font-mono">{f}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEST */}
        <TabsContent value="test">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Zap className="h-5 w-5 text-emerald-400" />Disparo de teste</CardTitle>
              <CardDescription className="text-[hsl(220,9%,55%)]">Envia template "hello_world" (default Meta) ou outro template aprovado para validar a integração ponta-a-ponta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Número destino (com DDD)</Label>
                  <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="11999999999" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">Template</Label>
                  <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={testTpl} onChange={(e) => setTestTpl(e.target.value)} placeholder="hello_world" />
                </div>
              </div>
              <Button onClick={sendTest} disabled={loadingAction === "send_test"} className="bg-emerald-600 hover:bg-emerald-700 w-full gap-2">
                {loadingAction === "send_test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar mensagem de teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILE */}
        <TabsContent value="profile">
          <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-400" />Perfil do negócio</CardTitle>
                <CardDescription className="text-[hsl(220,9%,55%)]">Informações públicas exibidas aos pacientes no WhatsApp.</CardDescription>
              </div>
              <Button onClick={fetchProfile} disabled={loadingAction === "business_profile"} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                {loadingAction === "business_profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Carregar
              </Button>
            </CardHeader>
            <CardContent>
              {!profile ? (
                <p className="text-sm text-[hsl(220,9%,55%)] text-center py-10">Clique em Carregar para buscar perfil.</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Sobre", profile.about],
                    ["Descrição", profile.description],
                    ["Email", profile.email],
                    ["Endereço", profile.address],
                    ["Vertical", profile.vertical],
                    ["Sites", (profile.websites || []).join(", ")],
                  ].map(([k, v]) => (
                    <div key={k as string} className="p-3 rounded-lg bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
                      <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">{k}</p>
                      <p className="text-sm mt-1">{(v as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
