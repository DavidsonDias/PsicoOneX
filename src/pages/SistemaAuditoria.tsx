import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, RefreshCw, Shield, Mail, MessageCircle, Bell, Database } from "lucide-react";
import { formatClinicDateTime } from "@/lib/clinic-datetime";
import { exportToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

type AuditRow = { id: string; created_at: string; user_id: string; action_type: string; entity_type: string; entity_id: string | null; ip_address: string | null; old_data: any; new_data: any };
type EmailRow = { id: string; created_at: string; recipient_email: string; template_name: string; status: string; error_message: string | null; metadata: any };
type WhatsRow = { id: string; created_at: string; to_phone: string | null; template_name: string | null; status: string; error_message: string | null; payload: any };
type NotifRow = { id: string; created_at: string; user_id: string; type: string; category: string | null; title: string; message: string | null; is_read: boolean };

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  queued: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  insert: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  update: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  restore: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

function StatusBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={STATUS_COLOR[value] ?? ""}>{value}</Badge>;
}

export default function SistemaAuditoria() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [tab, setTab] = useState("geral");
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [whats, setWhats] = useState<WhatsRow[]>([]);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);

  useEffect(() => {
    if (!roleLoading && !(isAdmin || isSuperAdmin)) {
      toast.error("Acesso restrito a administradores");
      navigate("/dashboard");
    }
  }, [roleLoading, isAdmin, isSuperAdmin, navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, e, w, n] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (a.data) setAudit(a.data as any);
      if (e.data) setEmails(e.data as any);
      if (w.data) setWhats(w.data as any);
      if (n.data) setNotifs(n.data as any);
    } catch (err: any) {
      toast.error("Falha ao carregar auditoria: " + (err.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin || isSuperAdmin) loadAll(); }, [isAdmin, isSuperAdmin]);

  const auditFiltered = useMemo(() => audit.filter((r) => {
    if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && r.action_type !== actionFilter) return false;
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [audit, entityFilter, actionFilter, search]);

  const entityOptions = useMemo(() => Array.from(new Set(audit.map((r) => r.entity_type))).sort(), [audit]);
  const actionOptions = useMemo(() => Array.from(new Set(audit.map((r) => r.action_type))).sort(), [audit]);

  const counters = useMemo(() => ({
    audit: audit.length,
    emails: emails.length,
    emailErrors: emails.filter((e) => /fail|error/i.test(e.status)).length,
    whats: whats.length,
    whatsErrors: whats.filter((w) => /fail|error/i.test(w.status)).length,
    notifs: notifs.length,
  }), [audit, emails, whats, notifs]);

  const exportCurrent = () => {
    if (tab === "geral") exportToCSV(auditFiltered as any, `auditoria-${Date.now()}`);
    else if (tab === "emails") exportToCSV(emails as any, `emails-${Date.now()}`);
    else if (tab === "whatsapp") exportToCSV(whats as any, `whatsapp-${Date.now()}`);
    else if (tab === "notificacoes") exportToCSV(notifs as any, `notificacoes-${Date.now()}`);
  };

  if (roleLoading || !(isAdmin || isSuperAdmin)) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <AppLayout>
      <Helmet><title>Auditoria do Sistema | PsicoOne</title></Helmet>
      <div className="container max-w-7xl py-6 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Auditoria & Observabilidade</h1>
            <p className="text-sm text-muted-foreground">Trilha completa de alterações, envios e eventos do sistema.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportCurrent}><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Eventos auditados</p><p className="text-2xl font-semibold">{counters.audit}</p></div><Database className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">E-mails ({counters.emailErrors} erros)</p><p className="text-2xl font-semibold">{counters.emails}</p></div><Mail className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">WhatsApp ({counters.whatsErrors} erros)</p><p className="text-2xl font-semibold">{counters.whats}</p></div><MessageCircle className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Notificações in-app</p><p className="text-2xl font-semibold">{counters.notifs}</p></div><Bell className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="emails">E-mails</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Entidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas entidades</SelectItem>
                      {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Ação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas ações</SelectItem>
                      {actionOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground ml-auto">{auditFiltered.length} registros</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                  {auditFiltered.map((r) => (
                    <div key={r.id} className="p-3 text-sm grid grid-cols-[160px_1fr] gap-3">
                      <div className="text-xs text-muted-foreground">{formatClinicDateTime(r.created_at)}</div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={r.action_type} />
                          <Badge variant="secondary">{r.entity_type}</Badge>
                          {r.entity_id && <code className="text-[10px] text-muted-foreground">{r.entity_id.slice(0, 8)}</code>}
                          <code className="text-[10px] text-muted-foreground ml-auto">user:{r.user_id.slice(0, 8)}</code>
                        </div>
                        {(r.old_data || r.new_data) && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">Ver diff</summary>
                            <pre className="mt-1 bg-muted/50 rounded p-2 overflow-x-auto text-[10px]">{JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                  {!auditFiltered.length && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum evento.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <Card><CardContent className="p-0">
              <div className="divide-y max-h-[65vh] overflow-y-auto">
                {emails.map((e) => (
                  <div key={e.id} className="p-3 text-sm grid grid-cols-[160px_1fr] gap-3">
                    <div className="text-xs text-muted-foreground">{formatClinicDateTime(e.created_at)}</div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={e.status} />
                        <Badge variant="secondary">{e.template_name}</Badge>
                        <span className="text-xs truncate">{e.recipient_email}</span>
                      </div>
                      {e.error_message && <p className="text-xs text-destructive">{e.error_message}</p>}
                    </div>
                  </div>
                ))}
                {!emails.length && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum envio registrado.</div>}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card><CardContent className="p-0">
              <div className="divide-y max-h-[65vh] overflow-y-auto">
                {whats.map((w) => (
                  <div key={w.id} className="p-3 text-sm grid grid-cols-[160px_1fr] gap-3">
                    <div className="text-xs text-muted-foreground">{formatClinicDateTime(w.created_at)}</div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={w.status} />
                        {w.template_name && <Badge variant="secondary">{w.template_name}</Badge>}
                        <span className="text-xs">{w.to_phone}</span>
                      </div>
                      {w.error_message && <p className="text-xs text-destructive">{w.error_message}</p>}
                    </div>
                  </div>
                ))}
                {!whats.length && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum envio.</div>}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="notificacoes">
            <Card><CardContent className="p-0">
              <div className="divide-y max-h-[65vh] overflow-y-auto">
                {notifs.map((n) => (
                  <div key={n.id} className="p-3 text-sm grid grid-cols-[160px_1fr] gap-3">
                    <div className="text-xs text-muted-foreground">{formatClinicDateTime(n.created_at)}</div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{n.type}</Badge>
                        {n.category && <Badge variant="secondary">{n.category}</Badge>}
                        {!n.is_read && <Badge className="bg-primary/10 text-primary">não lida</Badge>}
                      </div>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                    </div>
                  </div>
                ))}
                {!notifs.length && <div className="p-6 text-center text-sm text-muted-foreground">Sem notificações.</div>}
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
