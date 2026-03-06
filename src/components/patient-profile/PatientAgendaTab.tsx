import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Clock, Video, MapPin, Plus, Sparkles } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { syncAppointmentToGoogle } from "@/lib/google-calendar";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  type: string | null;
  duration_minutes: number | null;
  notes: string | null;
  session_value: number | null;
}

interface Props {
  patientId: string;
  patientName: string;
  defaultSessionValue?: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  rescheduled: { label: "Remarcado", variant: "outline" },
  no_show: { label: "Não compareceu", variant: "destructive" },
};

export function PatientAgendaTab({ patientId, patientName, defaultSessionValue }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    duration: "50",
    type: "presential",
    session_value: defaultSessionValue?.toString() || "200",
  });

  useEffect(() => { loadAppointments(); }, [patientId]);

  const loadAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, scheduled_at, status, type, duration_minutes, notes, session_value")
      .eq("patient_id", patientId)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar agenda"); return; }
    setAppointments(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); setSaving(false); return; }

    const scheduledAt = `${formData.date}T${formData.time}:00`;

    const { data: newApt, error } = await supabase.from("appointments").insert({
      patient_id: patientId,
      psychologist_id: session.user.id,
      scheduled_at: scheduledAt,
      duration_minutes: parseInt(formData.duration),
      type: formData.type,
      session_value: parseFloat(formData.session_value),
      status: "scheduled",
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error("Erro ao agendar"); return; }

    // Sync to Google Calendar
    if (newApt) {
      syncAppointmentToGoogle("create", {
        id: newApt.id,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(formData.duration),
        type: formData.type,
        notes: null,
        patient_name: patientName,
      });
    }

    toast.success("Sessão agendada!");
    setCreateOpen(false);
    loadAppointments();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const now = new Date();
  const upcoming = appointments.filter(a => isFuture(new Date(a.scheduled_at)) && a.status !== "cancelled");
  const past = appointments.filter(a => isPast(new Date(a.scheduled_at)) || a.status === "cancelled");

  const renderAppointment = (apt: Appointment) => {
    const date = new Date(apt.scheduled_at);
    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    return (
      <Card key={apt.id} className="hover:border-primary/30 transition-colors">
        <CardContent className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {apt.type === "online" ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium">
                {format(date, "dd/MM/yyyy", { locale: ptBR })} às {format(date, "HH:mm")}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                <span className="text-xs text-muted-foreground">{apt.duration_minutes || 50} min</span>
                {apt.type === "online" && <Badge variant="outline" className="text-xs">Online</Badge>}
              </div>
            </div>
          </div>
          {apt.session_value && (
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              R$ {Number(apt.session_value).toFixed(0)}
            </span>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{appointments.length} sessão(ões) total</p>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Agendamento</span>
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Próximas Sessões</h3>
          {upcoming.map(renderAppointment)}
        </div>
      )}

      {upcoming.length > 0 && past.length > 0 && <Separator />}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Histórico</h3>
          {past.map(renderAppointment)}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum agendamento encontrado</p>
        </div>
      )}

      {/* Create Appointment Dialog — patient auto-filled */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium text-sm">{patientName}</p>
              </div>
              <Badge variant="secondary" className="ml-auto text-xs">Contexto automático</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input type="number" value={formData.duration} onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presential">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={formData.session_value} onChange={(e) => setFormData(prev => ({ ...prev, session_value: e.target.value }))} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Agendando..." : "Agendar Sessão"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
