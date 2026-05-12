 import { motion } from "framer-motion";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { ActionMenu } from "@/components/ui/action-menu";
 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Calendar, MapPin, AlertCircle, Clock, FileText } from "lucide-react";
import { WhatsAppButton } from "./WhatsAppButton";
 import { format, differenceInYears } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface Patient {
   id: string;
   full_name: string;
   email: string | null;
   phone: string | null;
   birth_date: string | null;
   notes: string | null;
   status: string;
   cpf: string | null;
   address: string | null;
   emergency_contact: string | null;
   emergency_phone: string | null;
   created_at?: string;
   _count?: {
     appointments: number;
     records: number;
   };
 }
 
interface PatientCardProps {
  patient: Patient;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onClick?: () => void;
  onToggleStatus?: () => void;
}
 
 export function PatientCard({ patient, index, onEdit, onDelete, onClick, onToggleStatus }: PatientCardProps) {
   const initials = patient.full_name
     .split(" ")
     .map((n) => n[0])
     .slice(0, 2)
     .join("")
     .toUpperCase();
 
   const age = patient.birth_date
     ? differenceInYears(new Date(), new Date(patient.birth_date))
     : null;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95 }}
       transition={{ delay: index * 0.03 }}
     >
       <Card
         className="group hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
         onClick={onClick}
       >
         <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
           <div className="flex items-center gap-3">
             <Avatar className="h-12 w-12 border-2 border-primary/20">
               <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                 {initials}
               </AvatarFallback>
             </Avatar>
             <div>
               <CardTitle className="text-lg group-hover:text-primary transition-colors">
                 {patient.full_name}
               </CardTitle>
               {age && (
                 <p className="text-sm text-muted-foreground">{age} anos</p>
               )}
             </div>
           </div>
           <div onClick={(e) => e.stopPropagation()}>
             <ActionMenu
               onEdit={onEdit}
               onDelete={onDelete}
               deleteTitle="Excluir Paciente"
               deleteDescription={`Tem certeza que deseja excluir ${patient.full_name}? Todos os registros associados serão removidos.`}
             />
           </div>
         </CardHeader>
         <CardContent className="space-y-3 text-sm">
           {patient.email && (
             <div className="flex items-center gap-2 text-muted-foreground">
               <Mail className="w-4 h-4 shrink-0 text-primary/60" />
               <span className="truncate">{patient.email}</span>
             </div>
           )}
          {patient.phone && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Phone className="w-4 h-4 shrink-0 text-primary/60" />
                <span className="truncate">{patient.phone}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <WhatsAppButton patientId={patient.id} defaultPhone={patient.phone} />
              </div>
            </div>
          )}
           {patient.birth_date && (
             <div className="flex items-center gap-2 text-muted-foreground">
               <Calendar className="w-4 h-4 shrink-0 text-primary/60" />
               <span>{format(new Date(patient.birth_date), "dd/MM/yyyy")}</span>
             </div>
           )}
           {patient.address && (
             <div className="flex items-center gap-2 text-muted-foreground">
               <MapPin className="w-4 h-4 shrink-0 text-primary/60" />
               <span className="truncate">{patient.address}</span>
             </div>
           )}
           
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Badge
                  variant={patient.status === "active" ? "default" : "secondary"}
                  className="capitalize cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onToggleStatus?.(); }}
                >
                  {patient.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
             
             {patient._count && (
               <div className="flex items-center gap-3 text-xs text-muted-foreground">
                 <span className="flex items-center gap-1">
                   <Clock className="h-3 w-3" />
                   {patient._count.appointments} consultas
                 </span>
                 <span className="flex items-center gap-1">
                   <FileText className="h-3 w-3" />
                   {patient._count.records} prontuários
                 </span>
               </div>
             )}
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }