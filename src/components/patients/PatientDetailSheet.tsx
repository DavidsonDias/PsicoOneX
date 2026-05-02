import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline } from "@/components/ui/timeline";
import { Mail, Phone, Calendar, MapPin, User, FileText, Clock, AlertCircle, Edit, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
 
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
  user_id?: string | null;
  portal_activated_at?: string | null;
  created_at?: string;
}

interface PatientDetailSheetProps {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  appointments?: any[];
  records?: any[];
}
 
 export function PatientDetailSheet({
   patient,
   open,
   onClose,
   onEdit,
   appointments = [],
   records = [],
 }: PatientDetailSheetProps) {
  const [inviting, setInviting] = useState(false);

  if (!patient) return null;

  const initials = patient.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const portalActive = !!patient.user_id;

  const handleInvite = async () => {
    if (!patient.email) {
      toast.error("Cadastre um e-mail no paciente antes de enviar o convite.");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-patient", {
        body: { patient_id: patient.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Convite enviado por e-mail!", {
        description: `Válido por 7 dias. ${patient.email}`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar convite");
    } finally {
      setInviting(false);
    }
  };
 
   const age = patient.birth_date
     ? differenceInYears(new Date(), new Date(patient.birth_date))
     : null;
 
   const recentActivity = [
     ...appointments.slice(0, 5).map((apt: any) => ({
       id: apt.id,
       title: "Consulta",
       description: apt.notes || "Sessão de terapia",
       date: format(new Date(apt.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
       status: apt.status === "completed" ? "completed" as const : apt.status === "cancelled" ? "cancelled" as const : "pending" as const,
       icon: <Clock className="h-3 w-3" />,
     })),
     ...records.slice(0, 5).map((rec: any) => ({
       id: rec.id,
       title: `Sessão ${rec.session_number || ""}`,
       description: rec.complaints || "Prontuário registrado",
       date: format(new Date(rec.session_date), "dd/MM/yyyy", { locale: ptBR }),
       status: "completed" as const,
       icon: <FileText className="h-3 w-3" />,
     })),
   ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
 
   return (
     <Sheet open={open} onOpenChange={onClose}>
       <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
         <SheetHeader className="space-y-4">
           <div className="flex items-start justify-between">
             <div className="flex items-center gap-4">
               <Avatar className="h-16 w-16 border-2 border-primary/20">
                 <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                   {initials}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <SheetTitle className="text-xl">{patient.full_name}</SheetTitle>
                 <div className="flex items-center gap-2 mt-1">
                   <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                     {patient.status === "active" ? "Ativo" : "Inativo"}
                   </Badge>
                   {age && <span className="text-sm text-muted-foreground">{age} anos</span>}
                 </div>
               </div>
             </div>
             <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
               <Edit className="h-4 w-4" />
               Editar
             </Button>
           </div>
         </SheetHeader>
 
         <Tabs defaultValue="info" className="mt-6">
           <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="info">Informações</TabsTrigger>
             <TabsTrigger value="history">Histórico</TabsTrigger>
             <TabsTrigger value="notes">Observações</TabsTrigger>
           </TabsList>
 
           <TabsContent value="info" className="space-y-4 mt-4">
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm font-medium text-muted-foreground">Contato</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {patient.email && (
                   <div className="flex items-center gap-3">
                     <Mail className="h-4 w-4 text-primary" />
                     <span className="text-sm">{patient.email}</span>
                   </div>
                 )}
                 {patient.phone && (
                   <div className="flex items-center gap-3">
                     <Phone className="h-4 w-4 text-primary" />
                     <span className="text-sm">{patient.phone}</span>
                   </div>
                 )}
                 {patient.address && (
                   <div className="flex items-center gap-3">
                     <MapPin className="h-4 w-4 text-primary" />
                     <span className="text-sm">{patient.address}</span>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-sm font-medium text-muted-foreground">Dados Pessoais</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {patient.birth_date && (
                   <div className="flex items-center gap-3">
                     <Calendar className="h-4 w-4 text-primary" />
                     <span className="text-sm">
                       {format(new Date(patient.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                     </span>
                   </div>
                 )}
                 {patient.cpf && (
                   <div className="flex items-center gap-3">
                     <User className="h-4 w-4 text-primary" />
                     <span className="text-sm">CPF: {patient.cpf}</span>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {(patient.emergency_contact || patient.emergency_phone) && (
               <Card className="border-amber-500/30 bg-amber-500/5">
                 <CardHeader className="pb-3">
                   <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                     <AlertCircle className="h-4 w-4" />
                     Contato de Emergência
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-2">
                   {patient.emergency_contact && (
                     <p className="text-sm">{patient.emergency_contact}</p>
                   )}
                   {patient.emergency_phone && (
                     <p className="text-sm text-muted-foreground">{patient.emergency_phone}</p>
                   )}
                 </CardContent>
               </Card>
             )}
           </TabsContent>
 
           <TabsContent value="history" className="mt-4">
             {recentActivity.length > 0 ? (
               <Timeline items={recentActivity} />
             ) : (
               <div className="text-center py-8 text-muted-foreground">
                 <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                 <p>Nenhum histórico registrado</p>
               </div>
             )}
           </TabsContent>
 
           <TabsContent value="notes" className="mt-4">
             <Card>
               <CardContent className="pt-6">
                 {patient.notes ? (
                   <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
                 ) : (
                   <p className="text-sm text-muted-foreground italic">
                     Nenhuma observação registrada para este paciente.
                   </p>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
       </SheetContent>
     </Sheet>
   );
 }