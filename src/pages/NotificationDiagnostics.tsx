import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Mail, BellRing, Radio, ListChecks, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [email, setEmail] = useState<CheckResult>({ status: "loading", label: "E-mail (Resend / SMTP)" });
  const [realtime, setRealtime] = useState<CheckResult>({ status: "loading", label: "Realtime" });
  const [queue, setQueue] = useState<CheckResult>({ status: "loading", label: "Fila pgmq" });
  const [push, setPush] = useState<CheckResult>({ status: "loading", label: "Push (VAPID)" });
  const [lastSend, setLastSend] = useState<any>(null);
  const [lastFailure, setLastFailure] = useState<any>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);

  const runChecks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMe({ id: user.id, email: user.email || "" });

    // Last send + last failure (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const { data: lastOk } = await supabase
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at")
      .eq("status", "sent")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: lastFail } = await supabase
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
      status: lastFail && !lastOk ? "fail" : lastOk ? "ok" : "warn",
      label: "E-mail (Resend / SMTP)",
      detail: lastOk ? `Último envio: ${new Date(lastOk.created_at).toLocaleString("pt-BR")}` : "Sem envios nas últimas 24h",
    });

    // Push subscriptions
    const { count: pushCount } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id || "");
    setPush({
      status: (pushCount ?? 0) > 0 ? "ok" : "warn",
      label: "Push (VAPID)",
      detail: (pushCount ?? 0) > 0 ? `${pushCount} dispositivo(s) inscritos` : "Nenhum dispositivo inscrito",
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

    // Queue: check email_send_state recent activity (proxy)
    const { count: recent } = await supabase
      .from("email_send_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    setQueue({
      status: (recent ?? 0) > 0 ? "ok" : "warn",
      label: "Fila pgmq",
      detail: `${recent ?? 0} mensagens processadas nas últimas 24h`,
    });
  };

  useEffect(() => { runChecks(); }, []);

  const runTest = async (key: string, fn: () => Promise<void>) => {
    setSending(key);
    try { await fn(); } catch (e: any) { toast.error(e?.message || "Erro no teste"); }
    finally { setSending(null); }
  };

  const testEmail = () =>
    runTest("email", async () => {
      if (!me?.email) throw new Error("Sem e-mail do usuário");
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "appointment-confirmation",
          recipientEmail: me.email,
          idempotencyKey: `diag-${Date.now()}`,
          templateData: {
            patientName: "Teste",
            date: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            time: "09:00",
            duration: "50",
            type: "presential",
            psychologistName: "Diagnóstico",
            portalUrl: "https://psicoone.com",
          },
          metadata: { test: true },
        },
      });
      if (error) throw error;
      toast.success("E-mail de teste enfileirado");
      runChecks();
    });

  const testPush = () =>
    runTest("push", async () => {
      const { error } = await supabase.functions.invoke("send-push", {
        body: { user_id: me?.id, title: "Teste de push", body: "Diagnóstico de notificações ✓" },
      });
      if (error) throw error;
      toast.success("Push enviado — verifique notificações do dispositivo (precisa estar inscrito)");
      runChecks();
    });

  const testNotification = () =>
    runTest("notif", async () => {
      const { error } = await supabase.functions.invoke("dispatch-notification", {
        body: {
          user_id: me?.id,
          category: "system",
          type: "alert",
          title: "Diagnóstico",
          message: "Notificação de teste do painel.",
          action_path: "/configuracoes/diagnostico-notificacoes",
          action_label: "Abrir diagnóstico",
        },
      });
      if (error) throw error;
      toast.success("Notificação disparada — abra o sino 🔔 no topo");
      runChecks();
    });

  const checks: CheckResult[] = [email, realtime, queue, push];

  return (
    <AppLayout>
      <Helmet><title>Diagnóstico de Notificações · PsicoOne</title></Helmet>
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Notificações</h1>
          <p className="text-sm text-muted-foreground">Verifique a saúde do pipeline de e-mails, push, realtime e fila.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saúde dos canais</CardTitle>
            <CardDescription>Atualizado em tempo real</CardDescription>
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
            <Button variant="outline" onClick={runChecks} className="w-full">Re-executar verificações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testes manuais</CardTitle>
            <CardDescription>Dispare eventos reais e veja a chegada</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={testEmail} disabled={!!sending} className="gap-2">
              {sending === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar e-mail de teste
            </Button>
            <Button onClick={testPush} disabled={!!sending} className="gap-2">
              {sending === "push" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              Enviar push de teste
            </Button>
            <Button onClick={testNotification} disabled={!!sending} className="gap-2">
              {sending === "notif" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Disparar notificação
            </Button>
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
