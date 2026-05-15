import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Save,
  Send, ShieldCheck, RefreshCw, ExternalLink, Copy, Power, PowerOff, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type FieldType = "text" | "password" | "url" | "textarea";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}

export interface IntegrationSchema {
  integration_id: string;
  name: string;
  vendor: string;
  description: string;
  accent: string; // gradient
  docsUrl?: string;
  fields: FieldDef[];
  testFields?: FieldDef[]; // for "send test" payload
  testActionLabel?: string;
  guide?: { title: string; steps: string[] };
}

export const INTEGRATION_SCHEMAS: Record<string, IntegrationSchema> = {
  telegram: {
    integration_id: "telegram",
    name: "Telegram Bot",
    vendor: "Telegram Bot API",
    description: "Notificações alternativas via bot oficial. Mensagens HTML, broadcasts e alertas internos.",
    accent: "from-cyan-500 to-blue-700",
    docsUrl: "https://core.telegram.org/bots/api",
    fields: [
      { key: "bot_token", label: "Bot Token", type: "password", required: true, placeholder: "123456:ABC-DEF...", hint: "Crie um bot com @BotFather e cole o token aqui." },
      { key: "default_chat_id", label: "Chat ID padrão (opcional)", type: "text", placeholder: "-1001234567890", hint: "Use @userinfobot para descobrir o ID." },
    ],
    testFields: [
      { key: "chat_id", label: "Chat ID destino", type: "text", placeholder: "-1001234567890", required: true },
      { key: "text", label: "Mensagem", type: "textarea", placeholder: "🚀 Mensagem de teste do PsicoOne" },
    ],
    testActionLabel: "Enviar mensagem de teste",
    guide: {
      title: "Como configurar",
      steps: [
        "Abra o Telegram e fale com @BotFather",
        "Envie /newbot e siga os passos",
        "Copie o token e cole acima",
        "Adicione o bot ao grupo/chat e capture o chat_id via @userinfobot",
      ],
    },
  },
  twilio_sms: {
    integration_id: "twilio_sms",
    name: "Twilio SMS",
    vendor: "Twilio Programmable SMS",
    description: "SMS para pacientes sem WhatsApp. Cobertura global, entrega em segundos.",
    accent: "from-red-500 to-pink-700",
    docsUrl: "https://www.twilio.com/docs/sms",
    fields: [
      { key: "account_sid", label: "Account SID", type: "text", required: true, placeholder: "ACxxxxxxxxxxxxxxxxxxxxx" },
      { key: "auth_token", label: "Auth Token", type: "password", required: true, placeholder: "••••••••••••••••" },
      { key: "from_number", label: "Número de origem (E.164)", type: "text", required: true, placeholder: "+15555555555", hint: "Número Twilio comprado, no formato internacional." },
    ],
    testFields: [
      { key: "to", label: "Número destino (E.164)", type: "text", placeholder: "+5511999999999", required: true },
      { key: "body", label: "Mensagem", type: "textarea", placeholder: "Teste PsicoOne via Twilio" },
    ],
    testActionLabel: "Enviar SMS de teste",
    guide: {
      title: "Como configurar",
      steps: [
        "Crie uma conta em twilio.com",
        "No Console, copie Account SID e Auth Token",
        "Compre um número (Phone Numbers → Buy a Number)",
        "Cole as credenciais e o número acima",
      ],
    },
  },
  zapier: {
    integration_id: "zapier",
    name: "Zapier / Make",
    vendor: "iPaaS — Webhooks",
    description: "Conecte 6.000+ apps. Dispare Zaps a partir de eventos do PsicoOne (novo paciente, agendamento, pagamento).",
    accent: "from-amber-500 to-orange-700",
    docsUrl: "https://zapier.com/apps/webhook",
    fields: [
      { key: "webhook_url", label: "Webhook URL (Catch Hook)", type: "url", required: true, placeholder: "https://hooks.zapier.com/hooks/catch/..." },
      { key: "secret", label: "Secret (opcional)", type: "password", placeholder: "Header X-PsicoOne-Secret" },
    ],
    testActionLabel: "Disparar webhook de teste",
    guide: {
      title: "Como configurar",
      steps: [
        "No Zapier, crie um novo Zap",
        "Trigger: Webhooks by Zapier → Catch Hook",
        "Copie a URL gerada e cole acima",
        "Use 'Disparar webhook' para testar — o Zap deve aparecer no histórico",
      ],
    },
  },
  apple_calendar: {
    integration_id: "apple_calendar",
    name: "Apple Calendar (iCloud)",
    vendor: "Apple CalDAV",
    description: "Sincronização via CalDAV usando senha de app específica. Compatível com iCloud.",
    accent: "from-slate-400 to-slate-700",
    docsUrl: "https://support.apple.com/pt-br/102654",
    fields: [
      { key: "apple_id", label: "Apple ID (e-mail)", type: "text", required: true, placeholder: "voce@icloud.com" },
      { key: "app_password", label: "Senha específica do app", type: "password", required: true, placeholder: "xxxx-xxxx-xxxx-xxxx", hint: "Gere em appleid.apple.com → Senhas específicas." },
      { key: "caldav_url", label: "CalDAV URL", type: "url", placeholder: "https://caldav.icloud.com" },
    ],
    testActionLabel: "Validar credenciais CalDAV",
    guide: {
      title: "Como configurar",
      steps: [
        "Acesse appleid.apple.com → Login e Segurança → Senhas específicas",
        "Gere uma senha rotulada como 'PsicoOne'",
        "Cole o Apple ID e a senha gerada acima",
        "Clique em Validar para confirmar a conexão CalDAV",
      ],
    },
  },
  outlook: {
    integration_id: "outlook",
    name: "Outlook & Microsoft 365",
    vendor: "Microsoft Graph API",
    description: "Agenda corporativa via Graph API com OAuth client credentials.",
    accent: "from-sky-500 to-blue-800",
    docsUrl: "https://learn.microsoft.com/graph/auth-v2-service",
    fields: [
      { key: "tenant_id", label: "Tenant ID (Directory)", type: "text", required: true, placeholder: "00000000-0000-0000-0000-000000000000" },
      { key: "client_id", label: "Client ID (Application)", type: "text", required: true, placeholder: "00000000-0000-0000-0000-000000000000" },
      { key: "client_secret", label: "Client Secret", type: "password", required: true, placeholder: "••••••••••••••••" },
    ],
    testActionLabel: "Validar token Graph",
    guide: {
      title: "Como configurar",
      steps: [
        "Em portal.azure.com → Microsoft Entra ID → App registrations → New registration",
        "Crie um Client Secret em Certificates & secrets",
        "Em API permissions, adicione Calendars.ReadWrite (Application) e conceda admin consent",
        "Copie Tenant ID, Client ID e Secret acima",
      ],
    },
  },
};

interface Props {
  integrationId: string;
}

export default function GenericIntegrationPanel({ integrationId }: Props) {
  const schema = INTEGRATION_SCHEMAS[integrationId];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [row, setRow] = useState<any>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testPayload, setTestPayload] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => { void load(); }, [integrationId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("integration_configs")
      .select("*")
      .eq("integration_id", integrationId)
      .maybeSingle();
    if (data) {
      setRow(data);
      setConfig((data.config as Record<string, string>) || {});
    } else {
      setRow(null);
      setConfig({});
    }
    setLoading(false);
  };

  const updateField = (k: string, v: string) => setConfig((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (!schema) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      integration_id: schema.integration_id,
      name: schema.name,
      config,
      is_active: row?.is_active ?? true,
      updated_by: session?.user?.id,
    };
    const { error } = row
      ? await supabase.from("integration_configs").update(payload).eq("id", row.id)
      : await supabase.from("integration_configs").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Configuração salva", description: schema.name }); void load(); }
  };

  const toggleActive = async (v: boolean) => {
    if (!row) { await save(); return; }
    await supabase.from("integration_configs").update({ is_active: v }).eq("id", row.id);
    setRow({ ...row, is_active: v });
  };

  const test = async (action: "test" | "send" = "test") => {
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("integration-test", {
      body: { integration_id: integrationId, action, payload: testPayload },
    });
    setTesting(false);
    if (error) {
      toast({ title: "Falhou", description: error.message, variant: "destructive" });
      setTestResult({ success: false, error: error.message });
      return;
    }
    setTestResult(data);
    if (data?.success) toast({ title: action === "send" ? "🚀 Disparo enviado" : "✅ Conexão OK" });
    else toast({ title: "Falhou", description: data?.error || "erro", variant: "destructive" });
    void load();
  };

  const statusBadge = useMemo(() => {
    if (!row) return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Não configurado</Badge>;
    if (!row.is_active) return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Desativado</Badge>;
    if (row.last_test_status === "ok") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Operacional</Badge>;
    if (row.last_test_status === "failed") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><AlertTriangle className="h-3 w-3" />Falha</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Não testado</Badge>;
  }, [row]);

  if (!schema) return <div className="p-4 text-red-400">Schema não encontrado para "{integrationId}"</div>;
  if (loading) return <div className="space-y-3"><Skeleton className="h-32 w-full bg-[hsl(222,47%,18%)]" /><Skeleton className="h-64 w-full bg-[hsl(222,47%,18%)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* HERO */}
      <Card className="relative overflow-hidden border-[hsl(222,47%,18%)] bg-[hsl(222,47%,11%)] text-[hsl(0,0%,95%)]">
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${schema.accent}`} />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold tracking-tight">{schema.name}</h2>
                {statusBadge}
              </div>
              <p className="text-xs uppercase tracking-wider text-[hsl(220,9%,55%)]">{schema.vendor}</p>
              <p className="text-sm text-[hsl(220,9%,65%)] mt-2 max-w-2xl">{schema.description}</p>
              {row?.last_tested_at && (
                <p className="text-xs text-[hsl(220,9%,45%)] mt-2">
                  Último teste: {format(new Date(row.last_tested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {row.last_test_error && ` · ⚠ ${row.last_test_error}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(222,47%,16%)] border border-[hsl(222,47%,22%)]">
                {row?.is_active ? <Power className="h-4 w-4 text-emerald-400" /> : <PowerOff className="h-4 w-4 text-slate-500" />}
                <Label className="text-sm cursor-pointer">{row?.is_active ? "Ativo" : "Inativo"}</Label>
                <Switch checked={!!row?.is_active} onCheckedChange={toggleActive} />
              </div>
              {schema.docsUrl && (
                <Button variant="outline" size="sm" className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]" onClick={() => window.open(schema.docsUrl, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" />Docs
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GUIDE */}
      {schema.guide && (
        <Card className="bg-gradient-to-br from-violet-950/30 to-[hsl(222,47%,12%)] border-violet-900/40 text-[hsl(0,0%,95%)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-400" />{schema.guide.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5 text-sm text-[hsl(220,9%,75%)] list-decimal list-inside">
              {schema.guide.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* CREDENTIALS */}
      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" />Credenciais</CardTitle>
          <CardDescription className="text-[hsl(220,9%,55%)]">Visíveis somente para Super Admins. Persistem em integration_configs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {schema.fields.map((f) => (
              <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">
                  {f.label}{f.required && <span className="text-red-400">*</span>}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono text-sm" value={config[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
                ) : f.type === "password" ? (
                  <div className="relative">
                    <Input type={showSecrets[f.key] ? "text" : "password"} className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono pr-10" value={config[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} placeholder={f.placeholder} />
                    <button type="button" onClick={() => setShowSecrets((s) => ({ ...s, [f.key]: !s[f.key] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(220,9%,55%)] hover:text-white">
                      {showSecrets[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <Input type={f.type === "url" ? "url" : "text"} className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)] font-mono" value={config[f.key] || ""} onChange={(e) => updateField(f.key, e.target.value)} placeholder={f.placeholder} />
                )}
                {f.hint && <p className="text-[11px] text-[hsl(220,9%,50%)]">{f.hint}</p>}
              </div>
            ))}
          </div>

          <Separator className="bg-[hsl(222,47%,18%)]" />
          <div className="flex justify-between items-center flex-wrap gap-2">
            <Button variant="outline" onClick={load} className="border-[hsl(222,47%,22%)] bg-transparent text-white hover:bg-[hsl(222,47%,16%)]">
              <RefreshCw className="h-4 w-4 mr-2" />Recarregar
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => test("test")} disabled={testing} variant="outline" className="border-emerald-700 bg-transparent text-emerald-400 hover:bg-emerald-900/20">
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                Testar conexão
              </Button>
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TEST SEND */}
      {schema.testFields && (
        <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Send className="h-5 w-5 text-blue-400" />{schema.testActionLabel || "Enviar teste"}</CardTitle>
            <CardDescription className="text-[hsl(220,9%,55%)]">Valide a integração disparando uma mensagem real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {schema.testFields.map((f) => (
                <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
                  <Label className="text-xs uppercase tracking-wider text-[hsl(220,9%,60%)]">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)]" value={testPayload[f.key] || ""} onChange={(e) => setTestPayload((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} />
                  ) : (
                    <Input className="bg-[hsl(222,47%,8%)] border-[hsl(222,47%,22%)]" value={testPayload[f.key] || ""} onChange={(e) => setTestPayload((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <Button onClick={() => test("send")} disabled={testing} className="bg-blue-600 hover:bg-blue-700">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {schema.testActionLabel}
            </Button>
            {testResult && (
              <pre className="text-[11px] bg-[hsl(222,47%,8%)] border border-[hsl(222,47%,18%)] rounded-lg p-3 overflow-x-auto max-h-64 text-[hsl(220,9%,75%)]">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
