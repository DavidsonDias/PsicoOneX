import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, Video, MapPin, CalendarCheck2, FileText, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  type?: string;
  duration_minutes?: number;
  session_value?: number;
  google_event_id?: string | null;
  patients: {
    full_name: string;
    phone: string;
  };
}

interface AppointmentTimelineProps {
  appointments: Appointment[];
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMarkPaid?: (apt: Appointment) => void;
}

const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6);

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendado" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Realizado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "rescheduled", label: "Remarcado" },
  { value: "no_show", label: "Não compareceu" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; dot: string; border: string }> = {
  scheduled: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Agendado", dot: "bg-blue-500", border: "border-l-blue-500" },
  confirmed: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", label: "Confirmado", dot: "bg-green-500", border: "border-l-green-500" },
  completed: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", label: "Realizado", dot: "bg-purple-500", border: "border-l-purple-500" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelado", dot: "bg-destructive", border: "border-l-destructive" },
  rescheduled: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", label: "Remarcado", dot: "bg-orange-500", border: "border-l-orange-500" },
  no_show: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Não compareceu", dot: "bg-amber-500", border: "border-l-amber-500" },
};

export function AppointmentTimeline({ appointments, onEdit, onDelete, onStatusChange, onMarkPaid }: AppointmentTimelineProps) {
  const navigate = useNavigate();

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  const getAppointmentForSlot = (hour: number) => {
    return appointments.filter((apt) => {
      const aptHour = new Date(apt.scheduled_at).getHours();
      return aptHour === hour;
    });
  };

  return (
    <div className="space-y-0.5">
      {timeSlots.map((hour, index) => {
        const slotAppointments = getAppointmentForSlot(hour);
        const hasAppointment = slotAppointments.length > 0;

        return (
          <motion.div
            key={hour}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className={cn(
              "flex gap-4 py-3 px-4 rounded-lg transition-colors",
              hasAppointment ? "bg-muted/30" : "hover:bg-muted/20"
            )}
          >
            <div className="w-16 shrink-0 text-sm text-muted-foreground font-medium pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            <div className="flex-1 min-h-[60px]">
              {slotAppointments.length > 0 ? (
                <div className="space-y-2">
                  {slotAppointments.map((apt) => {
                    const config = getStatusConfig(apt.status || "scheduled");
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "p-3 rounded-lg border border-l-4 transition-all hover:shadow-md group",
                          config.bg,
                          config.border
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn("h-2 w-2 rounded-full shrink-0", config.dot)} />
                              <button
                                className="font-semibold truncate hover:underline text-left"
                                onClick={() => navigate(`/pacientes/${apt.patient_id}`)}
                              >
                                {apt.patients.full_name}
                              </button>
                              <Badge className={cn("text-[10px] px-1.5 py-0 h-4 border-0", config.bg, config.text)}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(apt.scheduled_at), "HH:mm")}
                                {apt.duration_minutes && ` (${apt.duration_minutes}min)`}
                              </span>
                              {apt.type === "online" ? (
                                <span className="flex items-center gap-1"><Video className="h-3 w-3 text-blue-500" />Online</span>
                              ) : (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-500" />Presencial</span>
                              )}
                              {apt.session_value && (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                  <DollarSign className="h-3 w-3" />
                                  R$ {Number(apt.session_value).toFixed(0)}
                                </span>
                              )}
                              {apt.google_event_id && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 text-primary">
                                      <CalendarCheck2 className="h-3 w-3" />
                                      <span className="text-xs">Google</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Sincronizado com Google Agenda</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {apt.notes && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{apt.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Select
                              value={apt.status || "scheduled"}
                              onValueChange={(value) => onStatusChange(apt.id, value)}
                            >
                              <SelectTrigger className={cn("h-7 text-xs w-[130px] border-0", config.bg, config.text)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <ActionMenu
                              onEdit={() => onEdit(apt)}
                              onDelete={() => onDelete(apt.id)}
                              deleteTitle="Excluir Agendamento"
                              deleteDescription="Deseja excluir este agendamento?"
                              extraActions={[
                                {
                                  label: "Abrir Prontuário",
                                  icon: <FileText className="h-4 w-4" />,
                                  onClick: () => navigate(`/prontuarios?patient=${apt.patient_id}`),
                                },
                                ...(onMarkPaid && apt.status !== "cancelled" ? [{
                                  label: "Marcar como Pago",
                                  icon: <DollarSign className="h-4 w-4" />,
                                  onClick: () => onMarkPaid(apt),
                                }] : []),
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center">
                  <div className="w-full h-px bg-border/50" />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
