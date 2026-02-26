import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trash2, RotateCcw, Search, Users, Calendar,
  FileText, DollarSign, AlertTriangle, Clock,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DeletedRecord {
  id: string;
  entity_type: string;
  name: string;
  deleted_at: string;
  deleted_reason: string | null;
  extra?: string;
}

const entityConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  patient: { icon: Users, label: "Paciente", color: "text-purple-500 bg-purple-500/10" },
  appointment: { icon: Calendar, label: "Agendamento", color: "text-blue-500 bg-blue-500/10" },
  medical_record: { icon: FileText, label: "Prontuário", color: "text-emerald-500 bg-emerald-500/10" },
  financial_transaction: { icon: DollarSign, label: "Transação", color: "text-amber-500 bg-amber-500/10" },
};

export default function Lixeira() {
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => { loadDeletedRecords(); }, []);

  const loadDeletedRecords = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    const [patients, appointments, records, transactions] = await Promise.all([
      supabase.from("patients").select("id, full_name, deleted_at, deleted_reason").eq("psychologist_id", uid).not("deleted_at", "is", null as any),
      supabase.from("appointments").select("id, scheduled_at, deleted_at, deleted_reason, patients(full_name)").eq("psychologist_id", uid).not("deleted_at", "is", null as any),
      supabase.from("medical_records").select("id, session_date, deleted_at, deleted_reason, patients(full_name)").eq("psychologist_id", uid).not("deleted_at", "is", null as any),
      supabase.from("financial_transactions").select("id, description, amount, deleted_at, deleted_reason").eq("psychologist_id", uid).not("deleted_at", "is", null as any),
    ]);

    const all: DeletedRecord[] = [
      ...(patients.data || []).map((p: any) => ({
        id: p.id, entity_type: "patient", name: p.full_name,
        deleted_at: p.deleted_at, deleted_reason: p.deleted_reason,
      })),
      ...(appointments.data || []).map((a: any) => ({
        id: a.id, entity_type: "appointment",
        name: a.patients?.full_name || "Paciente",
        deleted_at: a.deleted_at, deleted_reason: a.deleted_reason,
        extra: a.scheduled_at ? format(new Date(a.scheduled_at), "dd/MM/yyyy HH:mm") : "",
      })),
      ...(records.data || []).map((r: any) => ({
        id: r.id, entity_type: "medical_record",
        name: r.patients?.full_name || "Paciente",
        deleted_at: r.deleted_at, deleted_reason: r.deleted_reason,
        extra: r.session_date,
      })),
      ...(transactions.data || []).map((t: any) => ({
        id: t.id, entity_type: "financial_transaction",
        name: t.description || "Transação",
        deleted_at: t.deleted_at, deleted_reason: t.deleted_reason,
        extra: `R$ ${Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      })),
    ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    setRecords(all);
    setLoading(false);
  };

  const handleRestore = async (record: DeletedRecord) => {
    setRestoring(record.id);
    const updateData = { deleted_at: null, deleted_by: null, deleted_reason: null } as any;
    let error: any = null;

    if (record.entity_type === "patient") {
      ({ error } = await supabase.from("patients").update(updateData).eq("id", record.id));
    } else if (record.entity_type === "appointment") {
      ({ error } = await supabase.from("appointments").update(updateData).eq("id", record.id));
    } else if (record.entity_type === "medical_record") {
      ({ error } = await supabase.from("medical_records").update(updateData).eq("id", record.id));
    } else if (record.entity_type === "financial_transaction") {
      ({ error } = await supabase.from("financial_transactions").update(updateData).eq("id", record.id));
    }

    if (error) {
      toast.error("Erro ao restaurar registro");
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("audit_logs").insert({
          user_id: session.user.id,
          action_type: "restore",
          entity_type: record.entity_type,
          entity_id: record.id,
          new_data: { restored_at: new Date().toISOString() },
        } as any);
      }
      toast.success("Registro restaurado com sucesso!");
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
    }
    setRestoring(null);
  };

  const filtered = records.filter((r) =>
    !searchTerm ||
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.entity_type.includes(searchTerm.toLowerCase())
  );

  const byType = (type: string) => filtered.filter((r) => r.entity_type === type);

  const RecordItem = ({ record }: { record: DeletedRecord }) => {
    const config = entityConfig[record.entity_type];
    const Icon = config?.icon || Trash2;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className={cn("p-2.5 rounded-xl", config?.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{record.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px]">{config?.label}</Badge>
              {record.extra && <span>{record.extra}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(record.deleted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
            {record.deleted_reason && (
              <p className="text-xs text-muted-foreground mt-1 italic">"{record.deleted_reason}"</p>
            )}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={restoring === record.id}>
              <RotateCcw className={cn("h-4 w-4", restoring === record.id && "animate-spin")} />
              Restaurar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar registro?</AlertDialogTitle>
              <AlertDialogDescription>
                O registro "{record.name}" será restaurado e voltará a aparecer normalmente no sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleRestore(record)}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    );
  };

  return (
    <AppLayout title="Lixeira" description="Registros excluídos — restaure quando necessário">
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar registros excluídos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-[300px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">{records.length} registro{records.length !== 1 ? "s" : ""} na lixeira</span>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Todos ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="patient" className="gap-2">
            <Users className="h-4 w-4" />
            Pacientes ({byType("patient").length})
          </TabsTrigger>
          <TabsTrigger value="appointment" className="gap-2">
            <Calendar className="h-4 w-4" />
            Agenda ({byType("appointment").length})
          </TabsTrigger>
          <TabsTrigger value="medical_record" className="gap-2">
            <FileText className="h-4 w-4" />
            Prontuários ({byType("medical_record").length})
          </TabsTrigger>
          <TabsTrigger value="financial_transaction" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro ({byType("financial_transaction").length})
          </TabsTrigger>
        </TabsList>

        {["all", "patient", "appointment", "medical_record", "financial_transaction"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {(tab === "all" ? filtered : byType(tab)).length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Trash2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Lixeira vazia</h3>
                  <p className="text-muted-foreground text-sm">
                    Nenhum registro excluído encontrado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              (tab === "all" ? filtered : byType(tab)).map((record) => (
                <RecordItem key={record.id} record={record} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
}
