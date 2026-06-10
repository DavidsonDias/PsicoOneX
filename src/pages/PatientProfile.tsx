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
import { ArrowLeft, User, FileText, DollarSign, Calendar, File, Edit, Brain, Activity, Paperclip } from "lucide-react";
import { PatientForm, PatientFormData } from "@/components/patients/PatientForm";
import { differenceInYears } from "date-fns";
import { PatientOverviewTab } from "@/components/patient-profile/PatientOverviewTab";
import { PatientRecordsTab } from "@/components/patient-profile/PatientRecordsTab";
import { PatientFinancialTab } from "@/components/patient-profile/PatientFinancialTab";
import { PatientAgendaTab } from "@/components/patient-profile/PatientAgendaTab";
import { PatientDocumentsTab } from "@/components/patient-profile/PatientDocumentsTab";
import { PatientClinicalProfile } from "@/components/patient-profile/PatientClinicalProfile";
import { PatientUnifiedTimeline } from "@/components/patient-profile/PatientUnifiedTimeline";
import { PatientAttachmentsCenter } from "@/components/patient-profile/PatientAttachmentsCenter";
import { PatientFullRecord } from "@/components/patient-profile/PatientFullRecord";
import { PatientInviteButton } from "@/components/patients/PatientInviteButton";
import { SendOnboardingButton } from "@/components/patients/SendOnboardingButton";
import { PatientCompletenessHint } from "@/components/patients/PatientCompletenessHint";
import { PatientLifecycleManager } from "@/components/patients/PatientLifecycleManager";
import { ClipboardList } from "lucide-react";

export interface PatientFull {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  status: string;
  lifecycle_status?: string | null;
  psychologist_id?: string;
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

  const patientToFormData = (): Partial<PatientFormData> => {
    const p: any = patient;
    return {
      full_name: p.full_name,
      email: p.email || "",
      phone: p.phone || "",
      cpf: p.cpf || "",
      birth_date: p.birth_date || "",
      address: p.address || "",
      emergency_contact: p.emergency_contact || "",
      emergency_phone: p.emergency_phone || "",
      notes: p.notes || "",
      default_session_value: p.default_session_value?.toString() || "",
      payment_day: p.payment_day?.toString() || "",
      monthly_plan_value: p.monthly_plan_value?.toString() || "",
      social_name: p.social_name || "",
      birth_place: p.birth_place || "",
      gender: p.gender || "",
      marital_status: p.marital_status || "",
      rg: p.rg || "",
      rg_issuer: p.rg_issuer || "",
      cnh: p.cnh || "",
      religion: p.religion || "",
      profession: p.profession || "",
      profession_role: p.profession_role || "",
      company: p.company || "",
      education_level: p.education_level || "",
      cep: p.cep || "",
      street: p.street || "",
      address_number: p.address_number || "",
      complement: p.complement || "",
      neighborhood: p.neighborhood || "",
      city: p.city || "",
      state: p.state || "",
      whatsapp_phone: p.whatsapp_phone || "",
      phone_residential: p.phone_residential || "",
      emergency_relationship: p.emergency_relationship || "",
      emergency_whatsapp: p.emergency_whatsapp || "",
      father_name: p.father_name || "",
      father_profession: p.father_profession || "",
      mother_name: p.mother_name || "",
      mother_profession: p.mother_profession || "",
      siblings_brothers: p.siblings_brothers?.toString() || "",
      siblings_sisters: p.siblings_sisters?.toString() || "",
      spouse_name: p.spouse_name || "",
      spouse_relationship_time: p.spouse_relationship_time || "",
      initial_demand: p.initial_demand || "",
      prior_therapy: !!p.prior_therapy,
      prior_therapy_when: p.prior_therapy_when || "",
      prior_therapy_duration: p.prior_therapy_duration || "",
      prior_therapy_reason: p.prior_therapy_reason || "",
      uses_medication: !!p.uses_medication,
      health_plan: p.health_plan || "",
      health_plan_id: p.health_plan_id || "",
    };
  };

  const handleEditSubmit = async (data: PatientFormData) => {
    setSaving(true);
    try {
      const n = (v?: string) => (v && v.trim() ? v : null);
      const i = (v?: string) => (v && v.trim() ? parseInt(v) : null);
      const f = (v?: string) => (v && v.trim() ? parseFloat(v) : null);
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: data.full_name,
          email: n(data.email),
          phone: n(data.phone),
          cpf: n(data.cpf),
          birth_date: n(data.birth_date),
          address: n(data.address),
          emergency_contact: n(data.emergency_contact),
          emergency_phone: n(data.emergency_phone),
          notes: n(data.notes),
          default_session_value: f(data.default_session_value),
          payment_day: i(data.payment_day),
          monthly_plan_value: f(data.monthly_plan_value),
          social_name: n(data.social_name),
          birth_place: n(data.birth_place),
          gender: n(data.gender),
          marital_status: n(data.marital_status),
          rg: n(data.rg),
          rg_issuer: n(data.rg_issuer),
          cnh: n(data.cnh),
          religion: n(data.religion),
          profession: n(data.profession),
          profession_role: n(data.profession_role),
          company: n(data.company),
          education_level: n(data.education_level),
          cep: n(data.cep),
          street: n(data.street),
          address_number: n(data.address_number),
          complement: n(data.complement),
          neighborhood: n(data.neighborhood),
          city: n(data.city),
          state: n(data.state),
          whatsapp_phone: n(data.whatsapp_phone),
          phone_residential: n(data.phone_residential),
          emergency_relationship: n(data.emergency_relationship),
          emergency_whatsapp: n(data.emergency_whatsapp),
          father_name: n(data.father_name),
          father_profession: n(data.father_profession),
          mother_name: n(data.mother_name),
          mother_profession: n(data.mother_profession),
          siblings_brothers: i(data.siblings_brothers),
          siblings_sisters: i(data.siblings_sisters),
          spouse_name: n(data.spouse_name),
          spouse_relationship_time: n(data.spouse_relationship_time),
          initial_demand: n(data.initial_demand),
          prior_therapy: data.prior_therapy ?? false,
          prior_therapy_when: n(data.prior_therapy_when),
          prior_therapy_duration: n(data.prior_therapy_duration),
          prior_therapy_reason: n(data.prior_therapy_reason),
          uses_medication: data.uses_medication ?? false,
          health_plan: n(data.health_plan),
          health_plan_id: n(data.health_plan_id),
        })
        .eq("id", patient.id);

      if (error) throw error;
      toast.success("Cadastro atualizado com sucesso!");
      setEditOpen(false);
      if (id) loadPatient(id);
    } catch (e: any) {
      console.error(e);
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
    { value: "fullrecord", label: "Cadastro", icon: ClipboardList },
    { value: "timeline", label: "Timeline", icon: Activity },
    { value: "clinical", label: "Perfil IA", icon: Brain },
    { value: "records", label: "Prontuários", icon: FileText },
    { value: "attachments", label: "Anexos", icon: Paperclip },
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
                <PatientLifecycleManager
                  patientId={patient.id}
                  psychologistId={(patient as any).psychologist_id}
                  currentStatus={patient.lifecycle_status ?? patient.status}
                  onChanged={(s) => setPatient((p) => (p ? { ...p, lifecycle_status: s } : p))}
                />
                {age !== null && (
                  <span className="text-sm text-muted-foreground">{age} anos</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <SendOnboardingButton
              patientId={patient.id}
              patientName={patient.full_name}
              patientPhone={patient.phone || undefined}
              patientEmail={patient.email || undefined}
            />
            <PatientInviteButton
              patientId={patient.id}
              patientEmail={patient.email}
              portalActive={!!patient.user_id}
              variant="outline"
              size="sm"
            />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Editar Cadastro
            </Button>
          </div>
        </motion.div>

        <PatientCompletenessHint patient={patient} />


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
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-9 h-auto gap-1">
            {tabItems.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-col sm:flex-row gap-1 sm:gap-1.5 text-[10px] sm:text-sm py-2 px-1 sm:px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="leading-tight">{tab.label}</span>
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
            <TabsContent value="fullrecord" className="mt-0">
              <PatientFullRecord patientId={patient.id} onEdit={() => setEditOpen(true)} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <PatientUnifiedTimeline patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
            <TabsContent value="clinical" className="mt-0">
              <PatientClinicalProfile patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
            <TabsContent value="records" className="mt-0">
              <PatientRecordsTab patientId={patient.id} patientName={patient.full_name} />
            </TabsContent>
            <TabsContent value="attachments" className="mt-0">
              <PatientAttachmentsCenter patientId={patient.id} patientName={patient.full_name} />
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
