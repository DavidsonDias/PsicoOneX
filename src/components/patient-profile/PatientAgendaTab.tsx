import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Video, MapPin, Plus, Sparkles, Link2, Send, AlertTriangle, ExternalLink, Repeat } from "lucide-react";
import { format, isPast, isFuture, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { syncAppointmentToGoogle } from "@/lib/google-calendar";
import { sendAppointmentNotification, resendAppointmentAccess } from "@/services/notification.service";
import { toUTCFromClinicLocal } from "@/lib/clinic-datetime";

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

const RECURRENCE_INTERVAL: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

export function PatientAgendaTab({ patientId, patientName, defaultSessionValue }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    duration: "50",
    type: "presential",
    session_value: defaultSessionValue?.toString() || "200",
    notes: "",
    recurrence_enabled: false,
    recurrence_type: "weekly",
    recurrence_count: "4",
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

  // ---------- Conflict detection ----------
  const checkConflict = async (dateYMD: string, timeHM: string, durationMin: number): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const startUTC = toUTCFromClinicLocal(dateYMD, timeHM);
    const start = new Date(startUTC);
    const end = new Date(start.getTime() + durationMin * 60_000);
    // pull window ±2h, then test overlap client-side
    const winStart = new Date(start.getTime() - 2 * 3600_000).toISOString();
    const winEnd = new Date(end.getTime() + 2 * 3600_000).toISOString();
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes, patient_id, status, patients(full_name)")
      .eq("psychologist_id", session.user.id)
      .neq("status", "cancelled")
      .is("deleted_at", null)
      .gte("scheduled_at", winStart)
      .lte("scheduled_at", winEnd);
    if (!data) return null;
    for (const a of data) {
      const aStart = new Date(a.scheduled_at).getTime();
      const aEnd = aStart + (a.duration_minutes || 50) * 60_000;
      if (aStart < end.getTime() && aEnd > start.getTime()) {
        const name = (a as any).patients?.full_name || "outro paciente";
        return `Conflito com ${name} às ${format(new Date(aStart), "HH:mm")}`;
      }
    }
    return null;
  };

  // re-check conflict whenever date/time/duration changes
  useEffect(() => {
    if (!createOpen) return;
    const t = setTimeout(async () => {
      const c = await checkConflict(formData.date, formData.time, parseInt(formData.duration) || 50);
      setConflict(c);
    }, 250);
    return () => clearTimeout(t);
  }, [createOpen, formData.date, formData.time, formData.duration]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); setSaving(false); return; }

    // Block on hard conflict
    const c = await checkConflict(formData.date, formData.time, parseInt(formData.duration) || 50);
    if (c) { setConflict(c); toast.error(c); setSaving(false); return; }

    let scheduledAt: string;
    try {
      scheduledAt = toUTCFromClinicLocal(formData.date, formData.time);
    } catch {
      toast.error("Data/hora inválida"); setSaving(false); return;
    }

    const baseRow = {
      patient_id: patientId,
      psychologist_id: session.user.id,
      duration_minutes: parseInt(formData.duration),
      type: formData.type,
      session_value: parseFloat(formData.session_value) || 0,
      notes: formData.notes || null,
      status: "scheduled",
    };

    const { data: newApt, error } = await supabase.from("appointments").insert({
      ...baseRow,
      scheduled_at: scheduledAt,
      recurrence_type: formData.recurrence_enabled ? formData.recurrence_type : null,
    }).select("id").single();

    if (error || !newApt) {
      setSaving(false);
      toast.error("Erro ao agendar");
      return;
    }

    // Recurrence: create N-1 follow-ups
    let recurrenceCreated = 0;
    if (formData.recurrence_enabled) {
      const count = Math.max(1, parseInt(formData.recurrence_count) || 4);
      const interval = RECURRENCE_INTERVAL[formData.recurrence_type] || 7;
      const baseDate = new Date(`${formData.date}T${formData.time}:00`);
      const followUps = [];
      for (let i = 1; i < count; i++) {
        const next = addDays(baseDate, interval * i);
        const ymd = format(next, "yyyy-MM-dd");
        const hm = format(next, "HH:mm");
        followUps.push({
          ...baseRow,
          scheduled_at: toUTCFromClinicLocal(ymd, hm),
          recurrence_type: formData.recurrence_type,
          recurrence_parent_id: newApt.id,
        });
      }
      if (followUps.length) {
        const { error: rErr } = await supabase.from("appointments").insert(followUps);
        if (!rErr) recurrenceCreated = followUps.length;
      }
    }

    setSaving(false);

    // Google Calendar (main only — recurrence handled separately if needed)
    syncAppointmentToGoogle("create", {
      id: newApt.id,
      scheduled_at: scheduledAt,
      duration_minutes: parseInt(formData.duration),
      type: formData.type,
      notes: formData.notes || null,
      patient_name: patientName,
    });

    const result = await sendAppointmentNotification({
      appointmentId: newApt.id,
      patientId,
      psychologistId: session.user.id,
      scheduledAt,
      durationMinutes: parseInt(formData.duration),
      type: formData.type,
    });

    const extra = recurrenceCreated > 0 ? ` (+${recurrenceCreated} recorrentes)` : "";
    if (result.portalUrl) {
      const url = result.portalUrl;
      toast.success(
        <div className="space-y-2">
          <p>Sessão agendada!{extra}</p>
          <p className="text-xs text-muted-foreground">
            {result.emailSent
              ? "E-mail enviado ao paciente."
              : result.reason === "no_email"
              ? "Paciente sem e-mail — copie o link manualmente."
              : "Link gerado, mas e-mail não foi enviado."}
          </p>
          <button
            className="text-xs underline text-primary"
            onClick={() => { navigator.clipboard.writeText(url); toast.info("Link copiado!"); }}
          >
            Copiar link
          </button>
        </div>,
        { duration: 8000 }
      );
    } else {
      toast.success(`Sessão agendada!${extra}`);
    }

    setCreateOpen(false);
    setConflict(null);
    loadAppointments();
  };

  const handleResendLink = async (aptId: string) => {
    setSendingLink(aptId);
    const result = await resendAppointmentAccess(aptId);
    setSendingLink(null);

    if (result.portalUrl) {
      await navigator.clipboard.writeText(result.portalUrl);
      if (result.emailSent) toast.success("✅ Acesso enviado e link copiado!");
      else if (result.reason === "no_email") toast.info("Paciente sem e-mail. Link copiado para envio manual.");
      else toast.warning("Link copiado, mas e-mail não foi enviado.");
    } else {
      toast.error("❌ Erro ao gerar acesso");
    }
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium text-sm truncate">{patientName}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">Auto</Badge>
            </div>

            <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              Link de acesso será gerado automaticamente para o paciente
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input type="number" value={formData.duration} onChange={(e) => setFormData(p => ({ ...p, duration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presential">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={formData.session_value} onChange={(e) => setFormData(p => ({ ...p, session_value: e.target.value }))} />
              </div>
            </div>

            {conflict && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{conflict}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea rows={2} value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Notas internas sobre esta sessão" />
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Sessão recorrente</Label>
                </div>
                <Switch
                  checked={formData.recurrence_enabled}
                  onCheckedChange={(v) => setFormData(p => ({ ...p, recurrence_enabled: v }))}
                />
              </div>
              {formData.recurrence_enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={formData.recurrence_type} onValueChange={(v) => setFormData(p => ({ ...p, recurrence_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Quantidade</Label>
                    <Select value={formData.recurrence_count} onValueChange={(v) => setFormData(p => ({ ...p, recurrence_count: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 sessões</SelectItem>
                        <SelectItem value="4">4 sessões</SelectItem>
                        <SelectItem value="8">8 sessões</SelectItem>
                        <SelectItem value="12">12 sessões</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={saving || !!conflict}>
              {saving ? "Agendando..." : "Agendar Sessão"}
            </Button>

            <Link to="/agenda" className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="h-3 w-3" />
              Abrir Agenda completa (IA, recorrência aberta, edição em massa)
            </Link>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
