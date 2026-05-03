import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, User, FileText, DollarSign, Calendar, File, Edit, Brain } from "lucide-react";
import { PatientForm, PatientFormData } from "@/components/patients/PatientForm";
import { differenceInYears } from "date-fns";
import { PatientOverviewTab } from "@/components/patient-profile/PatientOverviewTab";
import { PatientRecordsTab } from "@/components/patient-profile/PatientRecordsTab";
import { PatientFinancialTab } from "@/components/patient-profile/PatientFinancialTab";
import { PatientAgendaTab } from "@/components/patient-profile/PatientAgendaTab";
import { PatientDocumentsTab } from "@/components/patient-profile/PatientDocumentsTab";
import { PatientClinicalProfile } from "@/components/patient-profile/PatientClinicalProfile";
import { PatientInviteButton } from "@/components/patients/PatientInviteButton";

export interface PatientFull {
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
  created_at: string | null;
  user_id?: string | null;
  portal_activated_at?: string | null;
  default_session_value: number | null;
  payment_day: number | null;
  treatment_start_date: string | null;
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadPatient(id);
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .eq("psychologist_id", session.user.id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        toast.error("Paciente não encontrado");
        navigate("/pacientes");
        return;
      }
      setPatient(data as PatientFull);
    } catch {
      toast.error("Erro ao carregar paciente");
      navigate("/pacientes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) return null;

  const patientToFormData = (): Partial<PatientFormData> => ({
    full_name: patient.full_name,
    email: patient.email || "",
    phone: patient.phone || "",
    cpf: patient.cpf || "",
    birth_date: patient.birth_date || "",
    address: patient.address || "",
    emergency_contact: patient.emergency_contact || "",
    emergency_phone: patient.emergency_phone || "",
    notes: patient.notes || "",
    default_session_value: patient.default_session_value?.toString() || "",
    payment_day: patient.payment_day?.toString() || "",
  });

  const handleEditSubmit = async (data: PatientFormData) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          cpf: data.cpf || null,
          birth_date: data.birth_date || null,
          address: data.address || null,
          emergency_contact: data.emergency_contact || null,
          emergency_phone: data.emergency_phone || null,
          notes: data.notes || null,
          default_session_value: data.default_session_value ? parseFloat(data.default_session_value) : null,
          payment_day: data.payment_day ? parseInt(data.payment_day) : null,
          monthly_plan_value: data.monthly_plan_value ? parseFloat(data.monthly_plan_value) : null,
        })
        .eq("id", patient.id);

      if (error) throw error;
      toast.success("Cadastro atualizado com sucesso!");
      setEditOpen(false);
      if (id) loadPatient(id);
    } catch {
      toast.error("Erro ao atualizar cadastro");
    } finally {
      setSaving(false);
    }
  };

  const initials = patient.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const age = patient.birth_date
    ? differenceInYears(new Date(), new Date(patient.birth_date))
    : null;

  const tabItems = [
    { value: "overview", label: "Visão Geral", icon: User },
    { value: "clinical", label: "Perfil IA", icon: Brain },
    { value: "records", label: "Prontuários", icon: FileText },
    { value: "financial", label: "Financeiro", icon: DollarSign },
    { value: "agenda", label: "Agenda", icon: Calendar },
    { value: "documents", label: "Documentos", icon: File },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{patient.full_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                  {patient.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
                {age !== null && (
                  <span className="text-sm text-muted-foreground">{age} anos</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" />
            Editar Cadastro
          </Button>
        </motion.div>

        {/* Edit Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cadastro — {patient.full_name}</DialogTitle>
            </DialogHeader>
            <PatientForm
              initialData={patientToFormData()}
              onSubmit={handleEditSubmit}
              submitLabel="Salvar Alterações"
              loading={saving}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto gap-1">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <TabsContent value="overview" className="mt-0">
              <PatientOverviewTab patient={patient} />
            </TabsContent>
            <TabsContent value="clinical" className="mt-0">
              <PatientClinicalProfile patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
            <TabsContent value="records" className="mt-0">
              <PatientRecordsTab patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
            <TabsContent value="financial" className="mt-0">
              <PatientFinancialTab patientId={patient.id} patientName={patient.full_name} defaultSessionValue={patient.default_session_value} />
            </TabsContent>
            <TabsContent value="agenda" className="mt-0">
              <PatientAgendaTab patientId={patient.id} patientName={patient.full_name} defaultSessionValue={patient.default_session_value} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <PatientDocumentsTab patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
