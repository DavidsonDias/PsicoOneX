import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plug, Search, Settings2, CheckCircle2, AlertTriangle, Clock,
  MessageCircle, Calendar, Mail, CreditCard, Brain, Phone, Apple,
  Hash, Zap, Cloud, Sparkles, ArrowRight, ShieldCheck, Activity, Gauge,
} from "lucide-react";
import WhatsAppAdminPanel from "./WhatsAppAdminPanel";
import GoogleCalendarAdminPanel from "./GoogleCalendarAdminPanel";
import GenericIntegrationPanel from "./GenericIntegrationPanel";

type Status = "active" | "configured" | "inactive" | "coming_soon" | "error";
type Category = "communication" | "calendar" | "payments" | "ai" | "marketing" | "all";

interface Integration {
  id: string;
  name: string;
  vendor: string;
  description: string;
  category: Exclude<Category, "all">;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
  metric?: { label: string; value: string | number };
  panel?: React.ComponentType;
  docsUrl?: string;
  accent: string; // gradient classes
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: "Todas",
  communication: "Comunicação",
  calendar: "Agenda",
  payments: "Pagamentos",
  ai: "Inteligência",
  marketing: "Marketing",
};

const STATUS_BADGE: Record<Status, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  active:       { label: "Operacional",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  configured:   { label: "Configurado",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",         icon: ShieldCheck },
  inactive:     { label: "Não conectado", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30",      icon: AlertTriangle },
  coming_soon:  { label: "Em breve",      cls: "bg-purple-500/15 text-purple-400 border-purple-500/30",   icon: Clock },
  error:        { label: "Erro",          cls: "bg-red-500/15 text-red-400 border-red-500/30",            icon: AlertTriangle },
};

export default function IntegrationsHub() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");

  // Live data
  const [waStatus, setWaStatus] = useState<Status>("inactive");
  const [waMetric, setWaMetric] = useState<number>(0);
  const [gcalCount, setGcalCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const [{ data: wa }, { count: waLogs }, { count: gcal }] = await Promise.all([
        supabase.from("whatsapp_config").select("phone_number_id, access_token, is_active, last_test_status").maybeSingle(),
        supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }),
        supabase.from("google_calendar_tokens").select("id", { count: "exact", head: true }),
      ]);
      setWaMetric(waLogs || 0);
      setGcalCount(gcal || 0);
      if (!wa?.phone_number_id || !wa?.access_token) setWaStatus("inactive");
      else if (wa.last_test_status === "failed") setWaStatus("error");
      else if (wa.is_active && wa.last_test_status === "ok") setWaStatus("active");
      else setWaStatus("configured");
    })();
  }, []);

  const integrations: Integration[] = useMemo(() => [
    {
      id: "whatsapp", name: "WhatsApp Business", vendor: "Meta Cloud API",
      description: "Mensagens transacionais, templates aprovados, webhooks bidirecionais e logs auditáveis.",
      category: "communication", icon: MessageCircle, status: waStatus, accent: "from-emerald-500 to-emerald-700",
      metric: { label: "Mensagens", value: waMetric }, panel: WhatsAppAdminPanel,
      docsUrl: "https://developers.facebook.com/docs/whatsapp",
    },
    {
      id: "google_calendar", name: "Google Calendar", vendor: "Google Workspace",
      description: "Sincronização bidirecional de agendamentos com OAuth 2.0 e refresh automático.",
      category: "calendar", icon: Calendar, status: gcalCount > 0 ? "active" : "configured",
      accent: "from-blue-500 to-indigo-700", metric: { label: "Conectados", value: gcalCount },
      panel: GoogleCalendarAdminPanel, docsUrl: "https://developers.google.com/calendar",
    },
    {
      id: "lovable_ai", name: "Lovable AI Gateway", vendor: "Multi-provider",
      description: "GPT-5, Gemini 2.5 e modelos de visão para assistente clínico, transcrição e geração.",
      category: "ai", icon: Brain, status: "active", accent: "from-violet-500 to-fuchsia-700",
      metric: { label: "Modelos", value: "12+" },
    },
    {
      id: "stripe", name: "Stripe Billing", vendor: "Stripe",
      description: "Assinaturas SaaS (Starter, Pro, Clinic), webhooks, customer portal e cobrança recorrente.",
      category: "payments", icon: CreditCard, status: "active", accent: "from-indigo-500 to-purple-700",
      metric: { label: "Modo", value: "Live" }, docsUrl: "https://stripe.com/docs",
    },
    {
      id: "resend", name: "Resend Email", vendor: "Resend",
      description: "E-mails transacionais (confirmação, lembretes, convites de portal) com fila e retry.",
      category: "communication", icon: Mail, status: "active", accent: "from-rose-500 to-orange-600",
      metric: { label: "Domínio", value: "notify.sevendevx.com" },
    },
    // —— Roadmap / coming soon ——
    { id: "apple_calendar", name: "Apple Calendar (iCloud)", vendor: "Apple", description: "Sincronização via CalDAV com tokens app-specific.", category: "calendar", icon: Apple, status: "coming_soon", accent: "from-slate-400 to-slate-700" },
    { id: "outlook", name: "Outlook & Microsoft 365", vendor: "Microsoft Graph", description: "Agenda corporativa via Graph API com OAuth.", category: "calendar", icon: Cloud, status: "coming_soon", accent: "from-sky-500 to-blue-800" },
    { id: "telegram", name: "Telegram Bot", vendor: "Telegram", description: "Notificações alternativas via bot oficial.", category: "communication", icon: Hash, status: "coming_soon", accent: "from-cyan-500 to-blue-700" },
    { id: "twilio_sms", name: "Twilio SMS", vendor: "Twilio", description: "SMS para pacientes sem WhatsApp.", category: "communication", icon: Phone, status: "coming_soon", accent: "from-red-500 to-pink-700" },
    { id: "zapier", name: "Zapier / Make", vendor: "iPaaS", description: "Conecte 6.000+ apps via webhooks de saída.", category: "marketing", icon: Zap, status: "coming_soon", accent: "from-amber-500 to-orange-700" },
  ], [waStatus, waMetric, gcalCount]);

  const filtered = integrations.filter(i =>
    (category === "all" || i.category === category) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.vendor.toLowerCase().includes(search.toLowerCase()))
  );

  const active = integrations.filter(i => i.status === "active").length;
  const total = integrations.filter(i => i.status !== "coming_soon").length;
  const opened = integrations.find(i => i.id === openId);
  const ActivePanel = opened?.panel;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* HERO */}
      <Card className="relative overflow-hidden border-[hsl(222,47%,18%)] bg-gradient-to-br from-[hsl(262,83%,12%)] via-[hsl(222,47%,12%)] to-[hsl(217,91%,14%)] text-[hsl(0,0%,95%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(262,83%,55%/0.20),transparent_55%),radial-gradient(circle_at_bottom_left,hsl(217,91%,55%/0.15),transparent_55%)] pointer-events-none" />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Plug className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  Central de Integrações
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </h2>
                <p className="text-sm text-[hsl(220,9%,60%)]">Hub enterprise para todas as APIs e conectores do PsicoOne</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg bg-[hsl(222,47%,16%)]/80 border border-[hsl(222,47%,22%)] backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">Saúde global</p>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5"><Activity className="h-4 w-4" />{active}/{total}</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[hsl(222,47%,16%)]/80 border border-[hsl(222,47%,22%)] backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-[hsl(220,9%,55%)]">Latência</p>
                <p className="text-lg font-bold text-blue-400 flex items-center gap-1.5"><Gauge className="h-4 w-4" />120ms</p>
              </div>
            </div>
          </div>

          {/* SEARCH + CATEGORY */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,9%,50%)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar integração ou fornecedor…"
                className="pl-9 bg-[hsl(222,47%,16%)]/70 border-[hsl(222,47%,22%)] backdrop-blur" />
            </div>
            <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
              <TabsList className="bg-[hsl(222,47%,16%)]/70 border border-[hsl(222,47%,22%)] backdrop-blur">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                  <TabsTrigger key={c} value={c} className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-xs">{CATEGORY_LABELS[c]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* GRID */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((i, idx) => {
          const S = STATUS_BADGE[i.status];
          const Icon = i.icon;
          const StatusIcon = S.icon;
          const isComingSoon = i.status === "coming_soon";
          return (
            <motion.div
              key={i.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -3 }}
              className={`group relative rounded-xl overflow-hidden border border-[hsl(222,47%,18%)] bg-[hsl(222,47%,11%)] cursor-pointer transition-all hover:border-[hsl(222,47%,30%)] hover:shadow-2xl hover:shadow-violet-500/5 ${isComingSoon ? "opacity-70" : ""}`}
              onClick={() => !isComingSoon && i.panel && setOpenId(i.id)}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${i.accent}`} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${i.accent} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="outline" className={`${S.cls} gap-1 text-[10px]`}>
                    <StatusIcon className="h-3 w-3" />{S.label}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[hsl(0,0%,95%)] group-hover:text-white">{i.name}</h3>
                  <p className="text-[11px] text-[hsl(220,9%,55%)] uppercase tracking-wider">{i.vendor}</p>
                </div>
                <p className="text-xs text-[hsl(220,9%,65%)] line-clamp-2 min-h-[32px]">{i.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-[hsl(222,47%,18%)]">
                  {i.metric ? (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-[hsl(220,9%,50%)]">{i.metric.label}</p>
                      <p className="text-sm font-bold text-[hsl(0,0%,90%)]">{i.metric.value}</p>
                    </div>
                  ) : <span className="text-[10px] text-[hsl(220,9%,45%)]">Roadmap Q3 · 2026</span>}
                  {!isComingSoon && i.panel && (
                    <Button size="sm" variant="ghost" className="text-[hsl(220,9%,70%)] hover:text-white hover:bg-[hsl(222,47%,16%)] gap-1 h-8">
                      <Settings2 className="h-3 w-3" /> Configurar <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Request new integration */}
        <motion.div whileHover={{ y: -3 }}
          className="rounded-xl border border-dashed border-[hsl(222,47%,22%)] bg-[hsl(222,47%,10%)] p-4 flex flex-col items-center justify-center text-center min-h-[200px] cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
          onClick={() => window.open("mailto:contato@sevendevx.com?subject=Nova integração PsicoOne", "_blank")}
        >
          <div className="h-11 w-11 rounded-xl bg-[hsl(222,47%,16%)] border border-[hsl(222,47%,22%)] flex items-center justify-center mb-2">
            <Plug className="h-5 w-5 text-[hsl(220,9%,55%)]" />
          </div>
          <p className="text-sm font-semibold text-[hsl(0,0%,90%)]">Solicitar nova integração</p>
          <p className="text-xs text-[hsl(220,9%,55%)] mt-1">Time SevenDevX desenvolve sob demanda</p>
        </motion.div>
      </div>

      {/* DRAWER */}
      <Sheet open={!!openId} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-5xl bg-[hsl(222,47%,8%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)] overflow-hidden p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-[hsl(222,47%,18%)]">
            <SheetTitle className="text-[hsl(0,0%,95%)] flex items-center gap-2">
              {opened && <opened.icon className="h-5 w-5" />}
              {opened?.name}
              {opened && <Badge variant="outline" className={STATUS_BADGE[opened.status].cls}>{STATUS_BADGE[opened.status].label}</Badge>}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 p-4">
            {ActivePanel && <ActivePanel />}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
