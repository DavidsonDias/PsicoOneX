import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { Plus, Clock, User, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
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
  const [formData, setFormData] = useState({
    patient_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    notes: ""
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
        id, patient_id, scheduled_at, status, notes,
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
      notes: ""
    });
  };

  const openEditDialog = (appointment: Appointment) => {
    const dateTime = new Date(appointment.scheduled_at);
    setFormData({
      patient_id: appointment.patient_id,
      date: format(dateTime, "yyyy-MM-dd"),
      time: format(dateTime, "HH:mm"),
      notes: appointment.notes || ""
    });
    setEditingAppointment(appointment);
  };

  const filteredAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.scheduled_at), selectedDate)
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500",
      confirmed: "bg-green-500",
      completed: "bg-purple-500",
      cancelled: "bg-red-500",
      no_show: "bg-orange-500"
    };
    return colors[status] || colors.scheduled;
  };

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
    <AppLayout title="Agenda" description="Gerencie seus agendamentos">
      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
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
                  placeholder="Informações adicionais"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Criar Agendamento</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[350px,1fr] gap-8">
        {/* Calendar Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Legenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { color: "bg-blue-500", label: "Agendado" },
                { color: "bg-green-500", label: "Confirmado" },
                { color: "bg-purple-500", label: "Realizado" },
                { color: "bg-red-500", label: "Cancelado" },
                { color: "bg-orange-500", label: "Faltou" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Nenhum agendamento para esta data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{appointment.patients.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(appointment.scheduled_at), "HH:mm")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status || "scheduled")}`} />
                          {getStatusLabel(appointment.status || "scheduled")}
                        </Badge>
                        <ActionMenu
                          onEdit={() => openEditDialog(appointment)}
                          onDelete={() => handleDeleteAppointment(appointment.id)}
                          deleteTitle="Excluir Agendamento"
                          deleteDescription="Tem certeza que deseja excluir este agendamento?"
                        />
                      </div>
                    </div>

                    {appointment.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{appointment.notes}</p>
                    )}

                    <div className="mt-3">
                      <Select 
                        value={appointment.status || "scheduled"} 
                        onValueChange={(value) => handleStatusChange(appointment.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
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
