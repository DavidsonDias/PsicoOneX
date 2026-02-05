 import { motion } from "framer-motion";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { ActionMenu } from "@/components/ui/action-menu";
 import { Clock, User, Video, MapPin, MoreHorizontal } from "lucide-react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
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
 
 const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00
 
 export function AppointmentTimeline({ appointments, onEdit, onDelete, onStatusChange }: AppointmentTimelineProps) {
   const getStatusConfig = (status: string) => {
     const configs: Record<string, { bg: string; text: string; label: string }> = {
       scheduled: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-600", label: "Agendado" },
       confirmed: { bg: "bg-green-500/10 border-green-500/30", text: "text-green-600", label: "Confirmado" },
       completed: { bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-600", label: "Realizado" },
       cancelled: { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", label: "Cancelado" },
       no_show: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600", label: "Faltou" },
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
                                 <span className="flex items-center gap-1">
                                   <Video className="h-3 w-3" />
                                   Online
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-1">
                                   <MapPin className="h-3 w-3" />
                                   Presencial
                                 </span>
                               )}
                             </div>
                             {apt.notes && (
                               <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{apt.notes}</p>
                             )}
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                             <Badge variant="outline" className={cn("text-xs", config.text)}>
                               {config.label}
                             </Badge>
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