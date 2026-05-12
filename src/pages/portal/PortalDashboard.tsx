import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, DollarSign, MessageSquare, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePatientPortalAuth } from "@/contexts/PatientPortalAuthContext";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import PortalNotificationPreferences from "@/components/portal/PortalNotificationPreferences";

export default function PortalDashboard() {
  const { patient } = usePatientPortalAuth();
  const [loading, setLoading] = useState(true);
  const [nextAppt, setNextAppt] = useState<any>(null);
  const [stats, setStats] = useState({ upcoming: 0, completed: 0, pendingPayments: 0, unread: 0 });

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const now = new Date().toISOString();
      const [{ data: next }, { count: upc }, { count: done }, { count: pend }] = await Promise.all([
        supabase.from("appointments").select("id, scheduled_at, duration_minutes, type, status, meeting_status")
          .eq("patient_id", patient.id).is("deleted_at", null).gte("scheduled_at", now)
          .order("scheduled_at", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id).is("deleted_at", null).gte("scheduled_at", now),
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id).is("deleted_at", null).eq("status", "completed"),
        supabase.from("financial_transactions").select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id).is("deleted_at", null).in("status", ["pending", "overdue"]),
      ]);
      setNextAppt(next);
      setStats({ upcoming: upc || 0, completed: done || 0, pendingPayments: pend || 0, unread: 0 });
      setLoading(false);
    })();
  }, [patient]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const apptLabel = (d: string) => {
    const date = new Date(d);
    if (isToday(date)) return `Hoje às ${format(date, "HH:mm")}`;
    if (isTomorrow(date)) return `Amanhã às ${format(date, "HH:mm")}`;
    return format(date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greet}, {patient?.full_name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua jornada terapêutica</p>
      </div>

      {/* Next session */}
      {nextAppt ? (
        <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs">Próxima sessão</Badge>
              <div className="text-lg font-semibold capitalize">{apptLabel(nextAppt.scheduled_at)}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{nextAppt.duration_minutes || 50}min</span>
                <span>• {nextAppt.type === "online" ? "Teleconsulta" : "Presencial"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/portal/agenda">Ver detalhes</Link>
              </Button>
              {nextAppt.type === "online" && (
                <Button asChild size="sm" className="gap-1.5">
                  <Link to={`/sala/${nextAppt.id}`}><Video className="h-3.5 w-3.5" />Entrar</Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5 text-center text-sm text-muted-foreground">
          Nenhuma sessão agendada no momento.
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Próximas" value={stats.upcoming} />
        <StatCard icon={CheckCircle2} label="Realizadas" value={stats.completed} />
        <StatCard icon={DollarSign} label="Pendentes" value={stats.pendingPayments} accent={stats.pendingPayments > 0 ? "warning" : undefined} />
        <StatCard icon={MessageSquare} label="Mensagens" value={stats.unread} />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-3">
        <QuickLink to="/portal/agenda" title="Minhas sessões" desc="Confirmar, reagendar ou cancelar" icon={Calendar} />
        <QuickLink to="/portal/financeiro" title="Pagamentos" desc="Histórico e cobranças pendentes" icon={DollarSign} />
      </div>

      <PortalNotificationPreferences />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold ${accent === "warning" ? "text-amber-500" : ""}`}>{value}</div>
    </Card>
  );
}

function QuickLink({ to, title, desc, icon: Icon }: any) {
  return (
    <Link to={to} className="group">
      <Card className="p-4 hover:border-primary/40 hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Card>
    </Link>
  );
}
