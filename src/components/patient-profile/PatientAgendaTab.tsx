import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Clock, Video, MapPin, Plus } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

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
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  rescheduled: { label: "Remarcado", variant: "outline" },
  no_show: { label: "Não compareceu", variant: "destructive" },
};

export function PatientAgendaTab({ patientId, patientName }: Props) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [patientId]);

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
        <Button className="gap-2" onClick={() => navigate("/agenda")}>
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
    </div>
  );
}
