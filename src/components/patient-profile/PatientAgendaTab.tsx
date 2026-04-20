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
import { Calendar, Clock, Video, MapPin, Plus, Sparkles, Link2, Copy, Send } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { syncAppointmentToGoogle } from "@/lib/google-calendar";
import { sendAppointmentNotification, resendAppointmentAccess } from "@/services/notification.service";
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
  const [sendingLink, setSendingLink] = useState<string | null>(null);
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

      // Auto-generate patient access link
      const token = await createPatientAccessLink({
        patientId,
        appointmentId: newApt.id,
        createdBy: session.user.id,
        expiresInHours: 72,
      });

      if (token) {
        const url = getPortalUrl(token);

        // Fetch patient email + psychologist profile for transactional email
        const [{ data: pat }, { data: prof }] = await Promise.all([
          supabase.from("patients").select("email").eq("id", patientId).single(),
          supabase.from("profiles").select("full_name, clinic_name").eq("id", session.user.id).single(),
        ]);

        if (pat?.email) {
          const aptDate = new Date(`${formData.date}T${formData.time}:00`);
          const dateStr = aptDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
          const timeStr = aptDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "appointment-confirmation",
              recipientEmail: pat.email,
              idempotencyKey: `apt-confirm-${newApt.id}`,
              templateData: {
                patientName: patientName.split(" ")[0],
                date: dateStr,
                time: timeStr,
                duration: formData.duration,
                type: formData.type,
                psychologistName: prof?.full_name,
                clinicName: prof?.clinic_name,
                portalUrl: url,
              },
            },
          }).then(({ data: emailResult }) => {
            if (emailResult?.success || emailResult?.queued) {
              toast.info("E-mail de confirmação enviado para o paciente!");
            }
          }).catch(() => {});
        }

        toast.success(
          <div className="space-y-2">
            <p>Sessão agendada!</p>
            <p className="text-xs text-muted-foreground">Link do paciente gerado automaticamente.</p>
            <button
              className="text-xs underline text-primary"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.info("Link copiado!");
              }}
            >
              Copiar link
            </button>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success("Sessão agendada!");
      }
    }

    setCreateOpen(false);
    loadAppointments();
  };

  const handleResendLink = async (aptId: string) => {
    setSendingLink(aptId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); setSendingLink(null); return; }

    const token = await createPatientAccessLink({
      patientId,
      appointmentId: aptId,
      createdBy: session.user.id,
      expiresInHours: 48,
    });

    if (token) {
      const url = getPortalUrl(token);
      await navigator.clipboard.writeText(url);
      toast.success("Novo link gerado e copiado para a área de transferência!");
    } else {
      toast.error("Erro ao gerar link");
    }
    setSendingLink(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const upcoming = appointments.filter(a => isFuture(new Date(a.scheduled_at)) && a.status !== "cancelled");
  const past = appointments.filter(a => isPast(new Date(a.scheduled_at)) || a.status === "cancelled");

  const renderAppointment = (apt: Appointment) => {
    const date = new Date(apt.scheduled_at);
    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    const isUpcoming = isFuture(date) && apt.status !== "cancelled";

    return (
      <Card key={apt.id} className="hover:border-primary/30 transition-colors">
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
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
          </div>

          {/* Resend link action for upcoming appointments */}
          {isUpcoming && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7"
                disabled={sendingLink === apt.id}
                onClick={() => handleResendLink(apt.id)}
              >
                <Send className="h-3 w-3" />
                {sendingLink === apt.id ? "Gerando..." : "Reenviar Acesso"}
              </Button>
            </div>
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

      {/* Create Appointment Dialog */}
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

            <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              Link de acesso será gerado automaticamente para o paciente
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
