import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Video, CheckCircle2, X, RefreshCw, CalendarPlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePatientPortalAuth } from "@/contexts/PatientPortalAuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadIcs } from "@/lib/ics-generator";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendado", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  confirmed: { label: "Confirmado", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  completed: { label: "Realizado", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  cancelled: { label: "Cancelado", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  reschedule_requested: { label: "Reagendamento solicitado", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
};

export default function PortalAgenda() {
  const { patient } = usePatientPortalAuth();
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<any[]>([]);
  const [reschedOpen, setReschedOpen] = useState<any>(null);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!patient) return;
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes, type, status, meeting_status, patient_confirmed_at")
      .eq("patient_id", patient.id)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false });
    setAppts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patient]);

  const now = new Date();
  const upcoming = appts.filter(a => new Date(a.scheduled_at) >= now);
  const past = appts.filter(a => new Date(a.scheduled_at) < now);

  const confirm = async (id: string) => {
    const { error } = await supabase.from("appointments")
      .update({ status: "confirmed", patient_confirmed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Não foi possível confirmar");
    toast.success("Presença confirmada ✓");
    load();
  };

  const cancel = async (id: string) => {
    if (!confirm) return;
    const { error } = await supabase.from("appointments")
      .update({ status: "cancelled", patient_cancelled_at: new Date().toISOString(), cancellation_reason: "Cancelado pelo paciente" })
      .eq("id", id);
    if (error) return toast.error("Não foi possível cancelar");
    toast.success("Sessão cancelada");
    load();
  };

  const submitReschedule = async () => {
    if (!newDate || !reschedOpen || !patient) return;
    setSubmitting(true);
    const { error: e1 } = await supabase.from("appointment_requests").insert({
      appointment_id: reschedOpen.id,
      patient_id: patient.id,
      psychologist_id: patient.psychologist_id,
      request_type: "reschedule",
      proposed_date: new Date(newDate).toISOString(),
      reason,
      status: "pending",
    });
    if (e1) {
      setSubmitting(false);
      return toast.error("Não foi possível solicitar reagendamento");
    }
    await supabase.from("appointments").update({ status: "reschedule_requested" }).eq("id", reschedOpen.id);
    await supabase.from("notifications").insert({
      user_id: patient.psychologist_id,
      type: "appointment",
      title: "Reagendamento solicitado",
      message: `${patient.full_name} solicitou reagendamento para ${format(new Date(newDate), "dd/MM 'às' HH:mm")}`,
      action_path: "/agenda",
      action_label: "Ver agenda",
    });
    toast.success("Solicitação enviada ao profissional ✓");
    setReschedOpen(null);
    setNewDate("");
    setReason("");
    setSubmitting(false);
    load();
  };

  const exportIcs = (a: any) => {
    downloadIcs({
      id: a.id,
      title: `Sessão com ${patient?.psychologist_name || "Psicólogo"}`,
      description: a.type === "online" ? `Link: ${window.location.origin}/sala/${a.id}` : "Sessão presencial",
      location: a.type === "online" ? "Online (Teleconsulta)" : "Presencial",
      startISO: a.scheduled_at,
      durationMinutes: a.duration_minutes || 50,
      url: a.type === "online" ? `${window.location.origin}/sala/${a.id}` : undefined,
    });
    toast.success("Arquivo .ics gerado");
  };

  const Card1 = ({ a, isPast }: any) => {
    const s = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="font-medium capitalize">
              {format(new Date(a.scheduled_at), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {format(new Date(a.scheduled_at), "HH:mm")} · {a.duration_minutes || 50}min · {a.type === "online" ? "Online" : "Presencial"}
            </div>
          </div>
          <Badge className={`${s.color} border-0`}>{s.label}</Badge>
        </div>

        {!isPast && a.status !== "cancelled" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {a.status !== "confirmed" && a.status !== "reschedule_requested" && (
              <Button size="sm" variant="outline" onClick={() => confirm(a.id)} className="h-8 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> Confirmar
              </Button>
            )}
            {a.status !== "reschedule_requested" && (
              <Button size="sm" variant="outline" onClick={() => setReschedOpen(a)} className="h-8 text-xs gap-1">
                <RefreshCw className="h-3 w-3" /> Reagendar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => exportIcs(a)} className="h-8 text-xs gap-1">
              <CalendarPlus className="h-3 w-3" /> Adicionar à agenda
            </Button>
            {a.type === "online" && (
              <Button size="sm" asChild className="h-8 text-xs gap-1">
                <Link to={`/sala/${a.id}`}><Video className="h-3 w-3" /> Entrar</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => cancel(a.id)} className="h-8 text-xs gap-1 text-destructive hover:text-destructive">
              <X className="h-3 w-3" /> Cancelar
            </Button>
          </div>
        )}
      </Card>
    );
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minhas Sessões</h1>
        <p className="text-sm text-muted-foreground">Confirme, reagende ou entre nas suas sessões</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Próximas ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Histórico ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Nenhuma sessão futura agendada
            </Card>
          ) : upcoming.map(a => <Card1 key={a.id} a={a} isPast={false} />)}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sem histórico ainda</Card>
          ) : past.map(a => <Card1 key={a.id} a={a} isPast />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!reschedOpen} onOpenChange={(o) => !o && setReschedOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar reagendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nova data e horário</Label>
              <Input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Conte ao seu profissional o motivo..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Sua solicitação será enviada para aprovação do profissional. Você receberá uma notificação assim que houver resposta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedOpen(null)}>Cancelar</Button>
            <Button onClick={submitReschedule} disabled={!newDate || submitting}>
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
