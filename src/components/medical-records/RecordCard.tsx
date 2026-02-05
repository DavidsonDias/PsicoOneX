 import { motion } from "framer-motion";
 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { ActionMenu } from "@/components/ui/action-menu";
 import { FileText, Calendar, User, Sparkles, ChevronRight } from "lucide-react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface MedicalRecord {
   id: string;
   patient_id: string;
   session_date: string;
   session_number: number | null;
   complaints: string | null;
   observations: string | null;
   techniques_used: string | null;
   evolution: string | null;
   next_steps: string | null;
   patients: {
     full_name: string;
   };
 }
 
 interface RecordCardProps {
   record: MedicalRecord;
   index: number;
   onClick: () => void;
   onEdit: () => void;
   onDelete: () => void;
 }
 
 export function RecordCard({ record, index, onClick, onEdit, onDelete }: RecordCardProps) {
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: index * 0.03 }}
     >
       <Card
         className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
         onClick={onClick}
       >
         <CardHeader className="pb-3">
           <div className="flex items-start justify-between">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                 <FileText className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <span className="font-semibold">{record.patients.full_name}</span>
                   {record.session_number && (
                     <Badge variant="outline" className="text-xs">
                       Sessão {record.session_number}
                     </Badge>
                   )}
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                   <Calendar className="h-3 w-3" />
                   {format(new Date(record.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                 </div>
               </div>
             </div>
             <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
               <ActionMenu
                 onEdit={onEdit}
                 onDelete={onDelete}
                 deleteTitle="Excluir Prontuário"
                 deleteDescription="Tem certeza que deseja excluir este registro?"
               />
             </div>
           </div>
         </CardHeader>
         <CardContent className="pt-0">
           {record.complaints && (
             <div className="mb-3">
               <p className="text-xs font-medium text-muted-foreground mb-1">Queixas</p>
               <p className="text-sm line-clamp-2">{record.complaints}</p>
             </div>
           )}
           {record.evolution && (
             <div className="mb-3">
               <p className="text-xs font-medium text-muted-foreground mb-1">Evolução</p>
               <p className="text-sm line-clamp-2">{record.evolution}</p>
             </div>
           )}
           <div className="flex items-center justify-between pt-3 border-t border-border">
             <div className="flex gap-2">
               {record.techniques_used && (
                 <Badge variant="secondary" className="text-xs">
                   <Sparkles className="h-3 w-3 mr-1" />
                   Técnicas aplicadas
                 </Badge>
               )}
             </div>
             <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
           </div>
         </CardContent>
       </Card>
     </motion.div>
   );
 }