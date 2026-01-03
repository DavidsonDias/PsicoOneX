import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Clock, User, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionMenu } from "@/components/ui/action-menu";

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

const Agenda = () => {
  const navigate = useNavigate();
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
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    await Promise.all([loadAppointments(session.user.id), loadPatients()]);
    setLoading(false);
  };

  const loadAppointments = async (psychologistId: string) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        scheduled_at,
        status,
        notes,
        patients (
          full_name,
          phone
        )
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
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, email")
      .eq("status", "active")
      .order("full_name");

    if (error) {
      toast.error("Erro ao carregar pacientes");
      return;
    }
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
    
    // Send notification to patient
    try {
      const patient = patients.find(p => p.id === formData.patient_id);
      if (patient) {
        await supabase.functions.invoke('send-notification', {
          body: {
            to: patient.email || "paciente@example.com",
            subject: "Consulta Agendada - PsicoOne",
            message: "Sua consulta foi agendada com sucesso. Aguardamos você!",
            type: "appointment_confirmation",
            patient_name: patient.full_name,
            appointment_date: scheduledAt
          }
        });
      }
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
    }
    
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

    toast.success("Agendamento atualizado com sucesso!");
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

    toast.success("Agendamento excluído com sucesso!");
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

  const filteredAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.scheduled_at), selectedDate)
  );

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
      completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
      no_show: "bg-orange-500/10 text-orange-500 border-orange-500/20"
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scheduled: "Agendado",
      confirmed: "Confirmado",
      completed: "Realizado",
      cancelled: "Cancelado",
      no_show: "Faltou"
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">Gerencie seus agendamentos</p>
            </div>
          </div>
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
                  <Label htmlFor="patient">Paciente *</Label>
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
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horário *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Informações adicionais sobre o agendamento"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Criar Agendamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[350px,1fr] gap-8">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md"
              />
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Legenda de Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Agendado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Confirmado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Realizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Cancelado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Faltou</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h2>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum agendamento para esta data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map(appointment => (
                    <div key={appointment.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{appointment.patients.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(appointment.scheduled_at), "HH:mm")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status || "scheduled")}`}>
                            {getStatusLabel(appointment.status || "scheduled")}
                          </span>
                          <ActionMenu
                            onEdit={() => openEditDialog(appointment)}
                            onDelete={() => handleDeleteAppointment(appointment.id)}
                            deleteTitle="Excluir Agendamento"
                            deleteDescription="Tem certeza que deseja excluir este agendamento?"
                          />
                        </div>
                      </div>

                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      )}

                      <div className="flex gap-2">
                        <Select value={appointment.status || "scheduled"} onValueChange={(value) => handleStatusChange(appointment.id, value)}>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => { if (!open) { setEditingAppointment(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditAppointment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_patient">Paciente *</Label>
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
                <Label htmlFor="edit_date">Data *</Label>
                <Input
                  id="edit_date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_time">Horário *</Label>
                <Input
                  id="edit_time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Observações</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Informações adicionais sobre o agendamento"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingAppointment(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
