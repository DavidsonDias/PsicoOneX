import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, RefreshCw, CheckCircle2, XCircle, Ban, Clock, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailLog {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const RANGES = [
  { id: "24h", label: "Últimas 24h", days: 1 },
  { id: "7d", label: "7 dias", days: 7 },
  { id: "30d", label: "30 dias", days: 30 },
  { id: "all", label: "Tudo", days: 365 },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  sent: { label: "Enviado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  dlq: { label: "Falhou", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  failed: { label: "Erro", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  suppressed: { label: "Suprimido", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Ban },
  bounced: { label: "Rejeitado", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  complained: { label: "Reclamação", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: Ban },
};

export const EmailMonitoringDashboard = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeId, setRangeId] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("davidsonfe7@gmail.com");

  const load = async () => {
    setLoading(true);
    const range = RANGES.find(r => r.id === rangeId)!;
    const since = subDays(new Date(), range.days).toISOString();
    const { data, error } = await supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setLogs(data as EmailLog[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rangeId]);

  // Deduplicar pelo message_id (último status)
  const dedupedLogs = useMemo(() => {
    const map = new Map<string, EmailLog>();
    for (const log of logs) {
      const key = log.message_id || log.id;
      if (!map.has(key)) map.set(key, log);
    }
    return Array.from(map.values());
  }, [logs]);

  const templates = useMemo(
    () => Array.from(new Set(dedupedLogs.map(l => l.template_name))).sort(),
    [dedupedLogs],
  );

  const filtered = useMemo(() => {
    return dedupedLogs.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (templateFilter !== "all" && l.template_name !== templateFilter) return false;
      if (search && !l.recipient_email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [dedupedLogs, statusFilter, templateFilter, search]);

  const stats = useMemo(() => {
    const total = dedupedLogs.length;
    const sent = dedupedLogs.filter(l => l.status === "sent").length;
    const failed = dedupedLogs.filter(l => ["dlq", "failed", "bounced"].includes(l.status)).length;
    const suppressed = dedupedLogs.filter(l => ["suppressed", "complained"].includes(l.status)).length;
    return { total, sent, failed, suppressed };
  }, [dedupedLogs]);

  const sendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-confirmation",
          recipientEmail: testEmail,
          idempotencyKey: `test-${Date.now()}`,
          templateData: {
            patientName: "Teste PsicoOne",
            appointmentDate: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
            psychologistName: "Sistema PsicoOne",
            sessionType: "E-mail de teste de entregabilidade",
          },
        },
      });
      if (error) throw error;
      toast({ title: "E-mail enviado", description: `Disparado para ${testEmail}. Atualize em alguns segundos.` });
      setTimeout(load, 3000);
    } catch (e: any) {
      toast({ title: "Falha no envio", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
      <CardContent className="p-5">
        <p className="text-xs text-[hsl(220,9%,55%)] mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Status DNS */}
      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-medium">Domínio: notify.sevendevx.com</p>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { k: "SPF", v: "✓ v=spf1 mailgun" },
              { k: "DKIM", v: "✓ Gerenciado" },
              { k: "MX", v: "✓ Mailgun EU" },
              { k: "DMARC", v: "✓ Padrão" },
            ].map(i => (
              <div key={i.k} className="p-3 rounded bg-[hsl(222,47%,14%)] border border-[hsl(222,47%,20%)]">
                <p className="text-[hsl(220,9%,55%)]">{i.k}</p>
                <p className="font-medium text-emerald-400">{i.v}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} color="text-[hsl(0,0%,95%)]" />
        <StatCard label="Enviados" value={stats.sent} color="text-emerald-400" />
        <StatCard label="Falhas" value={stats.failed} color="text-red-400" />
        <StatCard label="Suprimidos" value={stats.suppressed} color="text-yellow-400" />
      </div>

      {/* Test send */}
      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" /> Enviar e-mail de teste
          </p>
          <div className="flex gap-2 flex-wrap">
            <Input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-sm flex-1 min-w-[200px]"
            />
            <Button onClick={sendTest} disabled={sending} className="bg-blue-600 hover:bg-blue-700">
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Enviando..." : "Disparar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardContent className="p-5">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex gap-1">
              {RANGES.map(r => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={rangeId === r.id ? "default" : "outline"}
                  onClick={() => setRangeId(r.id)}
                  className={rangeId === r.id ? "bg-blue-600 hover:bg-blue-700" : "bg-transparent border-[hsl(222,47%,20%)] text-[hsl(220,9%,70%)] hover:bg-[hsl(222,47%,14%)]"}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[200px] bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-sm">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos templates</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar destinatário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-[hsl(222,47%,14%)] border-[hsl(222,47%,20%)] text-sm flex-1 min-w-[180px]"
            />
            <Button size="sm" variant="outline" onClick={load} className="bg-transparent border-[hsl(222,47%,20%)] text-[hsl(220,9%,70%)] hover:bg-[hsl(222,47%,14%)]">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card className="bg-[hsl(222,47%,12%)] border-[hsl(222,47%,18%)] text-[hsl(0,0%,95%)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[hsl(222,47%,14%)] border-b border-[hsl(222,47%,20%)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[hsl(220,9%,55%)]">Status</th>
                  <th className="text-left p-3 font-medium text-[hsl(220,9%,55%)]">Template</th>
                  <th className="text-left p-3 font-medium text-[hsl(220,9%,55%)]">Destinatário</th>
                  <th className="text-left p-3 font-medium text-[hsl(220,9%,55%)]">Data</th>
                  <th className="text-left p-3 font-medium text-[hsl(220,9%,55%)]">Erro</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="p-6 text-center text-[hsl(220,9%,55%)]">Carregando...</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-[hsl(220,9%,55%)]">Nenhum e-mail encontrado no período.</td></tr>
                )}
                {filtered.slice(0, 100).map(log => {
                  const meta = STATUS_META[log.status] || { label: log.status, color: "bg-gray-500/15 text-gray-400 border-gray-500/30", icon: Mail };
                  const Icon = meta.icon;
                  return (
                    <tr key={log.id} className="border-b border-[hsl(222,47%,18%)] hover:bg-[hsl(222,47%,14%)]">
                      <td className="p-3">
                        <Badge className={`${meta.color} border gap-1`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[hsl(220,9%,75%)]">{log.template_name}</td>
                      <td className="p-3">{log.recipient_email}</td>
                      <td className="p-3 text-[hsl(220,9%,55%)]">{format(new Date(log.created_at), "dd/MM HH:mm:ss")}</td>
                      <td className="p-3 text-red-400 max-w-[300px] truncate" title={log.error_message || ""}>{log.error_message || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="p-3 text-center text-xs text-[hsl(220,9%,55%)]">Mostrando 100 de {filtered.length} resultados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
