import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  patients: {
    full_name: string;
  };
}

interface WeeklyCalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function WeeklyCalendar({
  appointments,
  selectedDate,
  onDateChange,
  onAppointmentClick,
}: WeeklyCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) =>
      isSameDay(new Date(apt.scheduled_at), date)
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500",
      confirmed: "bg-green-500",
      completed: "bg-purple-500",
      cancelled: "bg-red-500",
      no_show: "bg-orange-500",
    };
    return colors[status] || colors.scheduled;
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const days = direction === "prev" ? -7 : 7;
    onDateChange(addDays(selectedDate, days));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Semana
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWeek("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(weekStart, "dd MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd MMM", { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateWeek("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={cn(
                "p-2 rounded-lg text-center transition-all",
                isSameDay(day, selectedDate)
                  ? "bg-primary text-primary-foreground"
                  : isToday(day)
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <p className="text-[10px] font-medium uppercase">
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <p className={cn(
                "text-lg font-bold",
                isSameDay(day, selectedDate) ? "" : "text-foreground"
              )}>
                {format(day, "d")}
              </p>
              {getAppointmentsForDay(day).length > 0 && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {getAppointmentsForDay(day).slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(apt.status))}
                    />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected day appointments */}
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h4>
          
          {getAppointmentsForDay(selectedDate).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum agendamento para este dia
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {getAppointmentsForDay(selectedDate).map((apt, index) => (
                <motion.button
                  key={apt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onAppointmentClick?.(apt)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn("w-1 h-8 rounded-full", getStatusColor(apt.status))} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {apt.patients.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.scheduled_at), "HH:mm")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {apt.status === "scheduled" && "Agendado"}
                    {apt.status === "confirmed" && "Confirmado"}
                    {apt.status === "completed" && "Realizado"}
                    {apt.status === "cancelled" && "Cancelado"}
                    {apt.status === "no_show" && "Faltou"}
                  </Badge>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
