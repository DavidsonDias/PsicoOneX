import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Clock, User, Calendar as CalendarIcon, Video, MapPin, ChevronLeft, ChevronRight, LayoutGrid, List, Zap, Bell, RefreshCw, Repeat, DollarSign } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, addDays, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentTimeline } from "@/components/agenda/AppointmentTimeline";
import { QuickStats } from "@/components/agenda/QuickStats";
import { DayOverview } from "@/components/agenda/DayOverview";
import { ActionMenu } from "@/components/ui/action-menu";
import { StatsOverview } from "@/components/ui/stats-overview";
import { Switch } from "@/components/ui/switch";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  type?: string;
  duration_minutes?: number;
  session_value?: number;
  recurrence_type?: string | null;
  recurrence_end_date?: string | null;
  recurrence_parent_id?: string | null;
  patients: {
    full_name: string;
    phone: string;
  };
}

interface Patient {
  id: string;
  full_name: string;
  email?: string;
}

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [formData, setFormData] = useState({
    patient_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    notes: "",
    type: "presential",
    duration: "50",
    status: "scheduled",
    session_value: "200",
    recurrence_enabled: false,
    recurrence_type: "weekly",
    recurrence_count: "4",
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setUserId(session.user.id);
    await Promise.all([loadAppointments(session.user.id), loadPatients()]);
    setLoading(false);
  };

  const loadAppointments = async (psychologistId: string) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, patient_id, scheduled_at, status, notes, type, duration_minutes,
        patients (full_name, phone)
      `)
      .eq("psychologist_id", psychologistId)
      .order("scheduled_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar agendamentos");
      return;
    }
    setAppointments((data || []) as unknown as Appointment[]);
  };

  const loadPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, email")
      .eq("status", "active")
      .order("full_name");
    setPatients(data || []);
  };

  // Check for time conflicts
  const checkConflicts = useCallback((date: string, time: string, duration: number, excludeId?: string) => {
    const newStart = new Date(`${date}T${time}:00`);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    return appointments.filter(apt => {
      if (excludeId && apt.id === excludeId) return false;
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.scheduled_at);
      const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes || 50) * 60000);
      return newStart < aptEnd && newEnd > aptStart;
    });
  }, [appointments]);

  // Generate recurrence dates
  const generateRecurrenceDates = (startDate: string, startTime: string, type: string, count: number) => {
    const dates: string[] = [];
    let current = new Date(`${startDate}T${startTime}:00`);

    for (let i = 1; i < count; i++) {
      switch (type) {
        case "weekly":
          current = addWeeks(current, 1);
          break;
        case "biweekly":
          current = addWeeks(current, 2);
          break;
        case "monthly":
          current = addMonths(current, 1);
          break;
        default:
          current = addWeeks(current, 1);
      }
      dates.push(current.toISOString());
    }
    return dates;
  };

  const createFinancialTransaction = async (appointmentData: { patient_id: string; scheduled_at: string; session_value: number }) => {
    try {
      await supabase.from("financial_transactions").insert({
        psychologist_id: userId,
        patient_id: appointmentData.patient_id,
        type: "income",
        amount: appointmentData.session_value,
        description: "Sessão de atendimento",
        category: "Consulta",
        payment_method: "pix",
        status: "pending",
        due_date: appointmentData.scheduled_at.split("T")[0],
        appointment_id: null,
      });
    } catch (err) {
      console.error("Error creating financial transaction:", err);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      toast.error("Selecione um paciente");
      return;
    }

    // Check conflicts
    const conflicts = checkConflicts(formData.date, formData.time, parseInt(formData.duration));
    if (conflicts.length > 0) {
      toast.error(`Conflito de horário com ${conflicts[0].patients.full_name} às ${format(new Date(conflicts[0].scheduled_at), "HH:mm")}`);
      return;
    }

    // Create ISO string properly for UTC storage
    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`).toISOString();
    const sessionValue = parseFloat(formData.session_value) || 200;

    const appointmentBase = {
      patient_id: formData.patient_id,
      psychologist_id: userId,
      scheduled_at: scheduledAt,
      status: formData.status,
      notes: formData.notes || null,
      type: formData.type,
      duration_minutes: parseInt(formData.duration),
      session_value: sessionValue,
    };

    const { data: mainAppointment, error } = await supabase
      .from("appointments")
      .insert(appointmentBase)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar agendamento");
      return;
    }

    // Auto-create financial transaction (Agenda ↔ PsicoBank integration)
    await createFinancialTransaction({
      patient_id: formData.patient_id,
      scheduled_at: scheduledAt,
      session_value: sessionValue,
    });

    // Create recurrence if enabled
    if (formData.recurrence_enabled && mainAppointment) {
      const count = parseInt(formData.recurrence_count) || 4;
      const recurrenceDates = generateRecurrenceDates(
        formData.date, formData.time, formData.recurrence_type, count
      );

      const lastDate = recurrenceDates[recurrenceDates.length - 1]?.split("T")[0] || formData.date;

      await supabase.from("appointments").update({
        notes: `recurrence:${formData.recurrence_type}`,
      } as any).eq("id", mainAppointment.id);

      // Create child appointments
      for (const date of recurrenceDates) {
        const childData: any = {
          ...appointmentBase,
          scheduled_at: date,
        };
        
        const { error: childError } = await supabase.from("appointments").insert(childData);
        if (!childError) {
          await createFinancialTransaction({
            patient_id: formData.patient_id,
            scheduled_at: date,
            session_value: sessionValue,
          });
        }
      }

      toast.success(`Série de ${count} agendamentos criada com sucesso!`);
    } else {
      toast.success("Agendamento criado com sucesso!");
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "create",
      entity_type: "appointment",
      entity_id: mainAppointment?.id,
      new_data: { recurrence: formData.recurrence_enabled, type: formData.type },
    } as any);

    setDialogOpen(false);
    resetForm();
    await loadAppointments(userId);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    const conflicts = checkConflicts(formData.date, formData.time, parseInt(formData.duration), editingAppointment.id);
    if (conflicts.length > 0) {
      toast.error(`Conflito de horário com ${conflicts[0].patients.full_name}`);
      return;
    }

    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`).toISOString();

    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id: formData.patient_id,
        scheduled_at: scheduledAt,
        notes: formData.notes || null,
        type: formData.type,
        duration_minutes: parseInt(formData.duration),
        status: formData.status,
        session_value: parseFloat(formData.session_value) || 200,
      } as any)
      .eq("id", editingAppointment.id);

    if (error) {
      toast.error("Erro ao atualizar agendamento");
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "update",
      entity_type: "appointment",
      entity_id: editingAppointment.id,
    } as any);

    toast.success("Agendamento atualizado!");
    setEditingAppointment(null);
    resetForm();
    await loadAppointments(userId);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentId);

    if (error) {
      toast.error("Erro ao excluir agendamento");
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "delete",
      entity_type: "appointment",
      entity_id: appointmentId,
    } as any);

    toast.success("Agendamento excluído!");
    await loadAppointments(userId);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    
    // If completed, also update financial transaction
    if (newStatus === "completed") {
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt) {
        // Mark associated pending transaction as paid
        await supabase.from("financial_transactions")
          .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] })
          .eq("patient_id", apt.patient_id)
          .eq("status", "pending")
          .eq("due_date", new Date(apt.scheduled_at).toISOString().split("T")[0]);
      }
    }

    const { error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "status_change",
      entity_type: "appointment",
      entity_id: appointmentId,
      new_data: { new_status: newStatus },
    } as any);

    toast.success("Status atualizado!");
    await loadAppointments(userId);
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      notes: "",
      type: "presential",
      duration: "50",
      status: "scheduled",
      session_value: "200",
      recurrence_enabled: false,
      recurrence_type: "weekly",
      recurrence_count: "4",
    });
  };

  const openEditDialog = (appointment: Appointment) => {
    const dateTime = new Date(appointment.scheduled_at);
    setFormData({
      patient_id: appointment.patient_id,
      date: format(dateTime, "yyyy-MM-dd"),
      time: format(dateTime, "HH:mm"),
      notes: appointment.notes || "",
      type: appointment.type || "presential",
      duration: String(appointment.duration_minutes || 50),
      status: appointment.status || "scheduled",
      session_value: String(appointment.session_value || 200),
      recurrence_enabled: false,
      recurrence_type: appointment.recurrence_type || "weekly",
      recurrence_count: "4",
    });
    setEditingAppointment(appointment);
  };

  const filteredAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.scheduled_at), selectedDate)
  );

  const stats = {
    total: filteredAppointments.length,
    confirmed: filteredAppointments.filter(a => a.status === "confirmed").length,
    completed: filteredAppointments.filter(a => a.status === "completed").length,
    cancelled: filteredAppointments.filter(a => a.status === "cancelled").length,
    pending: filteredAppointments.filter(a => a.status === "scheduled").length,
  };

  const dayStats = useMemo(() => {
    const revenue = filteredAppointments
      .filter(a => a.status !== "cancelled")
      .reduce((sum, a) => sum + (a.session_value || 200), 0);
    return {
      totalSlots: 10,
      bookedSlots: filteredAppointments.length,
      confirmedSlots: filteredAppointments.filter(a => a.status === "confirmed").length,
      completedSlots: filteredAppointments.filter(a => a.status === "completed").length,
      cancelledSlots: filteredAppointments.filter(a => a.status === "cancelled").length,
      revenue,
      avgDuration: 50,
    };
  }, [filteredAppointments]);

  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const monthAppointments = appointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      return d >= monthStart && d <= monthEnd;
    });
    const completed = monthAppointments.filter(a => a.status === "completed");
    const cancelled = monthAppointments.filter(a => a.status === "cancelled");
    const noShow = monthAppointments.filter(a => a.status === "no_show");
    const online = monthAppointments.filter(a => a.type === "online");
    const presential = monthAppointments.filter(a => a.type === "presential");
    const totalRevenue = completed.reduce((sum, a) => sum + (a.session_value || 200), 0);
    
    return {
      total: monthAppointments.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      online: online.length,
      presential: presential.length,
      attendanceRate: monthAppointments.length > 0 
        ? Math.round((completed.length / (monthAppointments.length - cancelled.length || 1)) * 100)
        : 0,
      revenue: totalRevenue,
    };
  }, [appointments, selectedDate]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  const AppointmentForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Paciente *</Label>
        <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o paciente" />
          </SelectTrigger>
          <SelectContent>
            {patients.map(patient => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Hora *</Label>
          <Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} required />
        </div>
        <div className="space-y-2">
          <Label>Duração</Label>
          <Select value={formData.duration} onValueChange={(v) => setFormData({...formData, duration: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="50">50 min</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="90">1h 30min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status Inicial</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" />
            Valor da Sessão
          </Label>
          <Input
            type="number"
            step="0.01"
            value={formData.session_value}
            onChange={(e) => setFormData({...formData, session_value: e.target.value})}
            placeholder="200.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Atendimento</Label>
        <div className="flex gap-3">
          <Button type="button" variant={formData.type === "presential" ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setFormData({...formData, type: "presential"})}>
            <MapPin className="h-4 w-4" /> Presencial
          </Button>
          <Button type="button" variant={formData.type === "online" ? "default" : "outline"} className="flex-1 gap-2" onClick={() => setFormData({...formData, type: "online"})}>
            <Video className="h-4 w-4" /> Online
          </Button>
        </div>
      </div>

      {/* Recurrence Section */}
      {!editingAppointment && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              Agendamento Recorrente
            </Label>
            <Switch checked={formData.recurrence_enabled} onCheckedChange={(v) => setFormData({...formData, recurrence_enabled: v})} />
          </div>
          {formData.recurrence_enabled && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Frequência</Label>
                <Select value={formData.recurrence_type} onValueChange={(v) => setFormData({...formData, recurrence_type: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Repetições</Label>
                <Select value={formData.recurrence_count} onValueChange={(v) => setFormData({...formData, recurrence_count: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2, 4, 8, 12, 16, 24].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} sessões</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Informações adicionais" rows={3} />
      </div>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );

  return (
    <AppLayout title="Agenda Inteligente" description="Gerencie seus agendamentos com eficiência e insights em tempo real">
      {/* Monthly Stats */}
      <StatsOverview
        stats={[
          { label: "Consultas do Mês", value: monthlyStats.total, icon: CalendarIcon, color: "blue", change: 12 },
          { label: "Realizadas", value: monthlyStats.completed, icon: Clock, color: "green", change: 8 },
          { label: "Cancelamentos", value: monthlyStats.cancelled, icon: RefreshCw, color: "red", change: -15 },
          { label: "Taxa de Presença", value: `${monthlyStats.attendanceRate}%`, icon: Zap, color: "purple", change: 5 },
        ]}
        className="mb-6"
      />

      {/* Strategic Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Online vs Presencial</div>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500" />
            <span className="font-bold">{monthlyStats.online}</span>
            <span className="text-muted-foreground">/</span>
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="font-bold">{monthlyStats.presential}</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">No-shows</div>
          <div className="text-lg font-bold text-amber-500">{monthlyStats.noShow}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Faturamento Mês</div>
          <div className="text-lg font-bold text-green-500">R$ {monthlyStats.revenue.toLocaleString("pt-BR")}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Ticket Médio</div>
          <div className="text-lg font-bold">
            R$ {monthlyStats.completed > 0 ? Math.round(monthlyStats.revenue / monthlyStats.completed).toLocaleString("pt-BR") : "0"}
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <QuickStats stats={stats} />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Novo Agendamento
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm onSubmit={handleCreateAppointment} submitLabel="Criar Agendamento" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[320px,1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} locale={ptBR} className="rounded-md w-full" />
            </CardContent>
          </Card>
          <DayOverview stats={dayStats} selectedDate={selectedDate} />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "list")}>
                <TabsList className="h-8">
                  <TabsTrigger value="timeline" className="px-3 text-xs"><LayoutGrid className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="list" className="px-3 text-xs"><List className="h-3 w-3" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-16">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Nenhum agendamento</p>
                <p className="text-sm text-muted-foreground">
                  Não há consultas agendadas para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            ) : viewMode === "timeline" ? (
              <AppointmentTimeline
                appointments={filteredAppointments}
                onEdit={openEditDialog}
                onDelete={handleDeleteAppointment}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{appointment.patients.full_name}</span>
                          {appointment.recurrence_type && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Repeat className="h-3 w-3" />
                              {appointment.recurrence_type === "weekly" ? "Semanal" : appointment.recurrence_type === "biweekly" ? "Quinzenal" : "Mensal"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(appointment.scheduled_at), "HH:mm")}</span>
                          <span className="text-xs">({appointment.duration_minutes || 50}min)</span>
                          {appointment.type === "online" ? (
                            <Badge variant="outline" className="text-xs"><Video className="h-3 w-3 mr-1" />Online</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />Presencial</Badge>
                          )}
                          {appointment.session_value && (
                            <span className="text-xs text-green-600 font-medium">R$ {Number(appointment.session_value).toFixed(0)}</span>
                          )}
                        </div>
                      </div>
                      <ActionMenu
                        onEdit={() => openEditDialog(appointment)}
                        onDelete={() => handleDeleteAppointment(appointment.id)}
                        deleteTitle="Excluir Agendamento"
                        deleteDescription="Tem certeza que deseja excluir este agendamento?"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Select value={appointment.status || "scheduled"} onValueChange={(value) => handleStatusChange(appointment.id, value)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Realizado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                          <SelectItem value="no_show">Faltou</SelectItem>
                        </SelectContent>
                      </Select>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground truncate flex-1">{appointment.notes}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => { if (!open) { setEditingAppointment(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <AppointmentForm onSubmit={handleEditAppointment} submitLabel="Salvar Alterações" />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

