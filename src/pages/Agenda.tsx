import { useState, useEffect, useMemo } from "react";
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
import { Plus, Clock, User, Calendar as CalendarIcon, Video, MapPin, ChevronLeft, ChevronRight, LayoutGrid, List, Zap, Bell, RefreshCw } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentTimeline } from "@/components/agenda/AppointmentTimeline";
import { QuickStats } from "@/components/agenda/QuickStats";
import { DayOverview } from "@/components/agenda/DayOverview";
import { ActionMenu } from "@/components/ui/action-menu";
import { StatsOverview } from "@/components/ui/stats-overview";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
   type?: string;
   duration_minutes?: number;
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
     duration: "50"
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
    setAppointments(data || []);
  };

  const loadPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, email")
      .eq("status", "active")
      .order("full_name");
    setPatients(data || []);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      toast.error("Selecione um paciente");
      return;
    }

    const scheduledAt = `${formData.date}T${formData.time}:00`;

    const { error } = await supabase
      .from("appointments")
      .insert({
        patient_id: formData.patient_id,
        psychologist_id: userId,
        scheduled_at: scheduledAt,
        status: "scheduled",
        notes: formData.notes || null
      });

    if (error) {
      toast.error("Erro ao criar agendamento");
      return;
    }

    toast.success("Agendamento criado com sucesso!");
    setDialogOpen(false);
    resetForm();
    await loadAppointments(userId);
  };

  const handleEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    const scheduledAt = `${formData.date}T${formData.time}:00`;

    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id: formData.patient_id,
        scheduled_at: scheduledAt,
        notes: formData.notes || null
      })
      .eq("id", editingAppointment.id);

    if (error) {
      toast.error("Erro ao atualizar agendamento");
      return;
    }

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

    toast.success("Agendamento excluído!");
    await loadAppointments(userId);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

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
       duration: "50"
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
       duration: String(appointment.duration_minutes || 50)
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

  // Day overview stats
  const dayStats = useMemo(() => ({
    totalSlots: 10,
    bookedSlots: filteredAppointments.length,
    confirmedSlots: filteredAppointments.filter(a => a.status === "confirmed").length,
    completedSlots: filteredAppointments.filter(a => a.status === "completed").length,
    cancelledSlots: filteredAppointments.filter(a => a.status === "cancelled").length,
    revenue: filteredAppointments.filter(a => a.status === "completed").length * 200,
    avgDuration: 50,
  }), [filteredAppointments]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const monthAppointments = appointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      return d >= monthStart && d <= monthEnd;
    });
    return {
      total: monthAppointments.length,
      completed: monthAppointments.filter(a => a.status === "completed").length,
      cancelled: monthAppointments.filter(a => a.status === "cancelled").length,
    };
  }, [appointments, selectedDate]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      confirmed: "Confirmado",
      completed: "Realizado",
      cancelled: "Cancelado",
      no_show: "Faltou"
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Agenda Inteligente" description="Gerencie seus agendamentos com eficiência e insights em tempo real">
      {/* Monthly Stats */}
      <StatsOverview
        stats={[
          {
            label: "Consultas do Mês",
            value: monthlyStats.total,
            icon: CalendarIcon,
            color: "blue",
            change: 12,
          },
          {
            label: "Realizadas",
            value: monthlyStats.completed,
            icon: Clock,
            color: "green",
            change: 8,
          },
          {
            label: "Cancelamentos",
            value: monthlyStats.cancelled,
            icon: RefreshCw,
            color: "red",
            change: -15,
          },
          {
            label: "Taxa de Presença",
            value: monthlyStats.total > 0 
              ? `${Math.round((monthlyStats.completed / monthlyStats.total) * 100)}%`
              : "0%",
            icon: Zap,
            color: "purple",
            change: 5,
          },
        ]}
        className="mb-6"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <QuickStats stats={stats} />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
             <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <CalendarIcon className="h-5 w-5 text-primary" />
                 Novo Agendamento
               </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
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
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                   <Label>Hora *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
                 <div className="space-y-2">
                   <Label>Duração</Label>
                   <Select value={formData.duration} onValueChange={(v) => setFormData({...formData, duration: v})}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="30">30 min</SelectItem>
                       <SelectItem value="50">50 min</SelectItem>
                       <SelectItem value="60">1 hora</SelectItem>
                       <SelectItem value="90">1h 30min</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
               <div className="space-y-2">
                 <Label>Tipo de Atendimento</Label>
                 <div className="flex gap-3">
                   <Button
                     type="button"
                     variant={formData.type === "presential" ? "default" : "outline"}
                     className="flex-1 gap-2"
                     onClick={() => setFormData({...formData, type: "presential"})}
                   >
                     <MapPin className="h-4 w-4" />
                     Presencial
                   </Button>
                   <Button
                     type="button"
                     variant={formData.type === "online" ? "default" : "outline"}
                     className="flex-1 gap-2"
                     onClick={() => setFormData({...formData, type: "online"})}
                   >
                     <Video className="h-4 w-4" />
                     Online
                   </Button>
                 </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Informações adicionais"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Criar Agendamento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       <div className="grid lg:grid-cols-[320px,1fr] gap-6">
        {/* Calendar Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md w-full"
              />
            </CardContent>
          </Card>
          
          {/* Day Overview */}
          <DayOverview stats={dayStats} selectedDate={selectedDate} />
        </div>

        {/* Appointments List */}
        <Card>
           <CardHeader className="pb-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                 >
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <CardTitle className="flex items-center gap-2 text-lg">
                   <CalendarIcon className="h-5 w-5 text-primary" />
                   {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                 </CardTitle>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                 >
                   <ChevronRight className="h-4 w-4" />
                 </Button>
               </div>
               <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "list")}>
                 <TabsList className="h-8">
                   <TabsTrigger value="timeline" className="px-3 text-xs">
                     <LayoutGrid className="h-3 w-3" />
                   </TabsTrigger>
                   <TabsTrigger value="list" className="px-3 text-xs">
                     <List className="h-3 w-3" />
                   </TabsTrigger>
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
                        </div>
                         <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(appointment.scheduled_at), "HH:mm")}</span>
                           {appointment.type === "online" ? (
                             <Badge variant="outline" className="text-xs">
                               <Video className="h-3 w-3 mr-1" />
                               Online
                             </Badge>
                           ) : (
                             <Badge variant="outline" className="text-xs">
                               <MapPin className="h-3 w-3 mr-1" />
                               Presencial
                             </Badge>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ActionMenu
                          onEdit={() => openEditDialog(appointment)}
                          onDelete={() => handleDeleteAppointment(appointment.id)}
                          deleteTitle="Excluir Agendamento"
                          deleteDescription="Tem certeza que deseja excluir este agendamento?"
                        />
                      </div>
                    </div>

                     <div className="mt-3 flex items-center gap-3">
                       <Select
                         value={appointment.status || "scheduled"}
                        onValueChange={(value) => handleStatusChange(appointment.id, value)}
                      >
                         <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAppointment} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
