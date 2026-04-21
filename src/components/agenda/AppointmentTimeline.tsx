import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/ui/action-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Video, MapPin, CalendarCheck2, FileText, DollarSign, Send, AlertTriangle, MoonStar, MailCheck, MailWarning, MailX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, isToday } from "date-fns";
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
  meeting_status?: string | null;
  patients: {
    full_name: string;
    phone: string;
  };
}

interface EmailStatusRecord {
  status: string;
  template_name: string;
  sent_at: string;
}

interface AppointmentTimelineProps {
  appointments: Appointment[];
  onEdit: (apt: Appointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onMarkPaid?: (apt: Appointment) => void;
  onResendAccess?: (apt: Appointment) => void;
  onJoinSession?: (apt: Appointment) => void;
  selectedDate?: Date;
  emailStatusMap?: Record<string, EmailStatusRecord>;
}

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

const SHOW_24H_KEY = "psicoone:agenda:show24h";

export function AppointmentTimeline({
  appointments,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkPaid,
  onResendAccess,
  onJoinSession,
  selectedDate,
  emailStatusMap,
}: AppointmentTimelineProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [show24h, setShow24h] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SHOW_24H_KEY) === "true";
  });

  // Auto-expand if any appointment falls outside 06h-22h window
  const hasOutOfRangeAppointment = appointments.some((apt) => {
    const h = new Date(apt.scheduled_at).getHours();
    return h < 6 || h >= 22;
  });

  const effective24h = show24h || hasOutOfRangeAppointment;
  const startHour = effective24h ? 0 : 6;
  const endHour = effective24h ? 24 : 22;
  const timeSlots = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

  // Persist toggle
  useEffect(() => {
    localStorage.setItem(SHOW_24H_KEY, String(show24h));
  }, [show24h]);

  // Auto-scroll to current hour (only if viewing today)
  useEffect(() => {
    if (!containerRef.current) return;
    const isViewingToday = !selectedDate || isToday(selectedDate);
    if (!isViewingToday) return;

    const targetHour = new Date().getHours();
    const slot = containerRef.current.querySelector<HTMLElement>(`[data-hour="${targetHour}"]`);
    if (slot) {
      slot.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedDate, effective24h, appointments.length]);

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  const getAppointmentForSlot = (hour: number) => {
    return appointments.filter((apt) => {
      const aptHour = new Date(apt.scheduled_at).getHours();
      return aptHour === hour;
    });
  };

  const currentHour = new Date().getHours();
  const isViewingToday = !selectedDate || isToday(selectedDate);

  return (
    <div>
      {/* Toggle 24h */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs text-muted-foreground">
          {effective24h ? "Exibindo 24 horas" : "Exibindo 06:00 às 22:00"}
          {hasOutOfRangeAppointment && !show24h && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              · Há sessões fora do horário comercial
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="show-24h" className="text-xs text-muted-foreground cursor-pointer">
            Mostrar 24h
          </Label>
          <Switch
            id="show-24h"
            checked={show24h}
            onCheckedChange={setShow24h}
          />
        </div>
      </div>

      <div ref={containerRef} className="space-y-0.5 max-h-[70vh] overflow-y-auto pr-2 scroll-smooth">
        {timeSlots.map((hour, index) => {
          const slotAppointments = getAppointmentForSlot(hour);
          const hasAppointment = slotAppointments.length > 0;
          const isUnusualHour = hour < 6 || hour >= 22;
          const isCurrentHour = isViewingToday && hour === currentHour;

          return (
            <motion.div
              key={hour}
              data-hour={hour}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.01, 0.3) }}
              className={cn(
                "flex gap-4 py-3 px-4 rounded-lg transition-colors relative",
                hasAppointment && "bg-muted/30",
                !hasAppointment && "hover:bg-muted/20",
                isCurrentHour && "ring-1 ring-primary/40 bg-primary/5"
              )}
            >
              {isCurrentHour && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
              )}
              <div className="w-20 shrink-0 text-sm font-medium pt-1 flex items-center gap-1">
                <span className={cn(isCurrentHour ? "text-primary font-bold" : "text-muted-foreground")}>
                  {String(hour).padStart(2, "0")}:00
                </span>
                {isUnusualHour && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MoonStar className="h-3 w-3 text-amber-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Horário fora do padrão comercial</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex-1 min-h-[60px]">
                {slotAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {slotAppointments.map((apt) => {
                      const config = getStatusConfig(apt.status || "scheduled");
                      const isOnline = apt.type === "online";
                      const meetingStatus = apt.meeting_status || "waiting";
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
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                {isUnusualHour && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Incomum
                                  </Badge>
                                )}
                                {isOnline && meetingStatus === "live" && (
                                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500 text-white animate-pulse">
                                    🔴 AO VIVO
                                  </Badge>
                                )}
                                {(() => {
                                  const emailRec = emailStatusMap?.[apt.id];
                                  if (!emailRec) {
                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-muted-foreground/30 text-muted-foreground cursor-help">
                                            <MailX className="h-2.5 w-2.5" />
                                            Sem e-mail
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Nenhum e-mail enviado para este agendamento</TooltipContent>
                                      </Tooltip>
                                    );
                                  }
                                  if (emailRec.status === "sent") {
                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-green-500/40 text-green-700 dark:text-green-400 cursor-help">
                                            <MailCheck className="h-2.5 w-2.5" />
                                            Enviado
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          E-mail enviado em {format(new Date(emailRec.sent_at), "dd/MM HH:mm")}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  }
                                  if (emailRec.status === "failed" || emailRec.status === "suppressed") {
                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-destructive/40 text-destructive cursor-help">
                                            <MailWarning className="h-2.5 w-2.5" />
                                            Falhou
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {emailRec.status === "suppressed"
                                            ? "E-mail bloqueado (endereço suprimido)"
                                            : "Falha no envio. Use 'Reenviar acesso'."}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  }
                                  return (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-muted-foreground/30 text-muted-foreground">
                                      Aguardando
                                    </Badge>
                                  );
                                })()}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(apt.scheduled_at), "HH:mm")}
                                  {apt.duration_minutes && ` (${apt.duration_minutes}min)`}
                                </span>
                                {isOnline ? (
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
                              {isOnline && onJoinSession && apt.status !== "cancelled" && apt.status !== "completed" && (
                                <button
                                  onClick={() => onJoinSession(apt)}
                                  className={cn(
                                    "h-7 px-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                                    meetingStatus === "live"
                                      ? "bg-green-500 text-white hover:bg-green-600"
                                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                                  )}
                                >
                                  <Video className="h-3 w-3" />
                                  {meetingStatus === "live" ? "Sala ativa" : "Iniciar"}
                                </button>
                              )}
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
                                  ...(onResendAccess && apt.status !== "cancelled" && apt.status !== "completed" ? [{
                                    label: "Reenviar Acesso",
                                    icon: <Send className="h-4 w-4" />,
                                    onClick: () => onResendAccess(apt),
                                  }] : []),
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
    </div>
  );
}
