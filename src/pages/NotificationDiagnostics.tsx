import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Radio, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Health = "ok" | "warn" | "fail" | "loading";

interface CheckResult {
  status: Health;
  label: string;
  detail?: string;
}


function StatusDot({ s }: { s: Health }) {
  if (s === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (s === "warn") return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

export default function NotificationDiagnostics() {
  const [email, setEmail] = useState<CheckResult>({ status: "loading", label: "Histórico de e-mails" });
  const [realtime, setRealtime] = useState<CheckResult>({ status: "loading", label: "Realtime" });
  const [queue, setQueue] = useState<CheckResult>({ status: "loading", label: "Atividade registrada" });
  const [push, setPush] = useState<CheckResult>({ status: "loading", label: "Dispositivos inscritos em push" });
  const [lastSend, setLastSend] = useState<any>(null);
  const [lastFailure, setLastFailure] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const runChecks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setChecking(true);

    // Last send + last failure (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { data: lastOk, error: sentError } = await supabase
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at")
      .eq("status", "sent")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: lastFail, error: failureError } = await supabase
      .from("email_send_log")
      .select("template_name, recipient_email, status, error_message, created_at")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLastSend(lastOk);
    setLastFailure(lastFail);

    setEmail({
      status: sentError || failureError ? "fail" : lastFail && !lastOk ? "fail" : lastOk ? "ok" : "warn",
      label: "E-mail (Resend / SMTP)",
      detail: sentError || failureError ? "Não foi possível consultar o histórico." : lastOk ? `Último envio: ${new Date(lastOk.created_at).toLocaleString("pt-BR")}` : "Sem envios nas últimas 24h",
    });

    // Push subscriptions
    const { count: pushCount, error: pushError } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id || "");
    setPush({
      status: pushError ? "fail" : "warn",
      label: "Push (VAPID)",
      detail: pushError ? "Não foi possível consultar as inscrições." : (pushCount ?? 0) > 0 ? `${pushCount} dispositivo(s) inscritos; entrega não verificada` : "Nenhum dispositivo inscrito",
    });

    // Realtime ping
    const ch = supabase.channel("diag-ping-" + Date.now());
    let ok = false;
    const t = setTimeout(() => {
      setRealtime({ status: ok ? "ok" : "fail", label: "Realtime", detail: ok ? "Conectado" : "Falha ao conectar" });
      supabase.removeChannel(ch);
    }, 3500);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ok = true;
        clearTimeout(t);
        setRealtime({ status: "ok", label: "Realtime", detail: "Conectado" });
        supabase.removeChannel(ch);
      }
    });

    // History count is not proof of queue or worker health.
    const { count: recent, error: activityError } = await supabase
      .from("email_send_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    setQueue({
      status: activityError ? "fail" : "warn",
      label: "Atividade registrada",
      detail: activityError ? "Não foi possível consultar a atividade." : `${recent ?? 0} registros nas últimas 24h; fila e processamento não verificados`,
    });
    setChecking(false);
  };

  useEffect(() => { runChecks(); }, []);

  const checks: CheckResult[] = [email, realtime, queue, push];

  return (
    <AppLayout>
      <Helmet><title>Diagnóstico de Notificações · PsicoOne</title></Helmet>
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Notificações</h1>
          <p className="text-sm text-muted-foreground">Consulte os registros disponíveis e a conexão Realtime. O histórico não confirma a entrega atual dos canais.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Verificações disponíveis</CardTitle>
            <CardDescription>Atualizado ao abrir esta tela ou reexecutar as verificações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <StatusDot s={c.status} />
                  <div>
                    <div className="font-medium">{c.label}</div>
                    {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
                  </div>
                </div>
                <Badge variant={c.status === "ok" ? "default" : c.status === "warn" ? "secondary" : "destructive"}>
                  {c.status === "loading" ? "…" : c.status.toUpperCase()}
                </Badge>
              </div>
            ))}
            <Button variant="outline" onClick={runChecks} disabled={checking} className="w-full">Re-executar verificações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testes de envio indisponíveis neste ambiente</CardTitle>
            <CardDescription>Durante a migração, os testes de envio são controlados no servidor. Esta tela consulta o histórico, as inscrições em push e a conexão Realtime.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/configuracoes/diagnostico-push"><Radio className="h-4 w-4" />Diagnóstico avançado de Push</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" />Últimos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="p-3 rounded-lg border border-border">
              <div className="font-medium">Último envio bem-sucedido</div>
              {lastSend ? (
                <div className="text-xs text-muted-foreground">
                  {lastSend.template_name} → {lastSend.recipient_email} · {new Date(lastSend.created_at).toLocaleString("pt-BR")}
                </div>
              ) : <div className="text-xs text-muted-foreground">Nenhum nas últimas 24h</div>}
            </div>
            <div className="p-3 rounded-lg border border-border">
              <div className="font-medium">Última falha</div>
              {lastFailure ? (
                <div className="text-xs text-muted-foreground">
                  {lastFailure.template_name} → {lastFailure.recipient_email} · {lastFailure.error_message?.slice(0, 120)}
                </div>
              ) : <div className="text-xs text-muted-foreground">Nenhuma 🎉</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
