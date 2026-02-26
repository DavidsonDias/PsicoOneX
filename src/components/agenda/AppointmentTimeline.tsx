import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/action-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, Video, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

interface AppointmentTimelineProps {
  appointments: Appointment[];
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
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

export function AppointmentTimeline({ appointments, onEdit, onDelete, onStatusChange }: AppointmentTimelineProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string; dot: string }> = {
      scheduled: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-600", label: "Agendado", dot: "bg-blue-500" },
      confirmed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-600", label: "Confirmado", dot: "bg-green-500" },
      completed: { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-600", label: "Realizado", dot: "bg-purple-500" },
      cancelled: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Cancelado", dot: "bg-destructive" },
      rescheduled: { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-600", label: "Remarcado", dot: "bg-orange-500" },
      no_show: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600", label: "Não compareceu", dot: "bg-amber-500" },
    };
    return configs[status] || configs.scheduled;
  };

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
                          "p-3 rounded-lg border transition-all hover:shadow-md",
                          config.bg
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn("h-2 w-2 rounded-full", config.dot)} />
                              <User className={cn("h-4 w-4", config.text)} />
                              <span className="font-semibold truncate">{apt.patients.full_name}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(apt.scheduled_at), "HH:mm")}
                                {apt.duration_minutes && ` (${apt.duration_minutes}min)`}
                              </span>
                              {apt.type === "online" ? (
                                <span className="flex items-center gap-1"><Video className="h-3 w-3" />Online</span>
                              ) : (
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Presencial</span>
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
