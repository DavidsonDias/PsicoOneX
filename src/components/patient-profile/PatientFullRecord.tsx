import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  FileText,
  MapPin,
  GraduationCap,
  Heart,
  Brain,
  Pill,
  Target,
  AlertTriangle,
  PhoneCall,
  ShieldCheck,
  PenLine,
  CheckCircle2,
  XCircle,
  Edit,
  Copy,
  Clock,
} from "lucide-react";

type RecordingAuth = "yes" | "no" | string | null;

interface Child {
  name?: string;
  age?: number | string;
}

interface Medication {
  name?: string;
  dose?: string;
  frequency?: string;
}

interface PatientFullData {
  id: string;
  full_name: string;
  social_name: string | null;
  email: string | null;
  phone: string | null;
  phone_residential: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  religion: string | null;
  birth_place: string | null;
  profession: string | null;
  profession_role: string | null;
  company: string | null;
  cpf: string | null;
  rg: string | null;
  rg_issuer: string | null;
  cnh: string | null;
  cep: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  education: string | null;
  education_level: string | null;
  spouse_name: string | null;
  spouse_relationship_time: string | null;
  children: Child[] | null;
  father_name: string | null;
  father_profession: string | null;
  mother_name: string | null;
  mother_profession: string | null;
  siblings_brothers: number | null;
  siblings_sisters: number | null;
  prior_therapy: boolean | null;
  prior_therapy_duration: string | null;
  prior_therapy_when: string | null;
  prior_therapy_reason: string | null;
  uses_medication: boolean | null;
  medications: Medication[] | null;
  initial_demand: string | null;
  notes: string | null;
  emergency_contact: string | null;
  emergency_relationship: string | null;
  emergency_phone: string | null;
  emergency_whatsapp: string | null;
  lgpd_truth_declaration: boolean;
  lgpd_privacy_consent: boolean;
  lgpd_data_consent: boolean;
  recording_authorization: RecordingAuth;
  lgpd_signature_data: string | null;
  lgpd_signed_at: string | null;
  signature_ip: string | null;
  signature_device: string | null;
  signature_timestamp: string | null;
  onboarding_status: string;
  onboarding_completed_at: string | null;
  health_plan: string | null;
  health_plan_id: string | null;
  user_id: string | null;
}

interface Props {
  patientId: string;
  onEdit?: () => void;
}

const Section = ({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <Card className="border-border/60">
    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent className="text-sm">{children}</CardContent>
  </Card>
);

const Field = ({
  label,
  value,
  copy,
}: {
  label: string;
  value?: React.ReactNode;
  copy?: string;
}) => {
  const empty = value === null || value === undefined || value === "" || value === false;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-xs sm:text-sm shrink-0">{label}</span>
      <span className="text-right font-medium flex items-center gap-1.5 break-words">
        {empty ? <span className="text-muted-foreground/60">—</span> : value}
        {copy && !empty && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => {
              navigator.clipboard.writeText(copy);
              toast.success("Copiado");
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </span>
    </div>
  );
};

const yesNo = (v?: boolean | null) =>
  v === true ? (
    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">SIM</Badge>
  ) : v === false ? (
    <Badge variant="outline" className="text-muted-foreground">NÃO</Badge>
  ) : null;

export function PatientFullRecord({ patientId, onEdit }: Props) {
  const [data, setData] = useState<PatientFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();
    if (error) toast.error("Erro ao carregar ficha");
    setData(row as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [patientId]);

  const handleApprove = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from("patients")
      .update({ onboarding_status: "approved" })
      .eq("id", patientId);
    setActionLoading(false);
    if (error) return toast.error("Erro ao aprovar");
    toast.success("Cadastro aprovado");
    load();
  };

  const handleRequestCorrection = async () => {
    if (!correctionText.trim()) {
      toast.error("Descreva o que precisa ser corrigido");
      return;
    }
    setActionLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const psychologistId = session.session?.user.id;

      const { error } = await supabase
        .from("patients")
        .update({ onboarding_status: "correction_requested" })
        .eq("id", patientId);
      if (error) throw error;

      if (data?.user_id) {
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: "onboarding_correction",
          title: "Correção solicitada no seu cadastro",
          message: correctionText,
          action_path: "/portal",
          action_label: "Revisar cadastro",
        });
      }

      // psychologist self-record
      if (psychologistId) {
        await supabase.from("audit_logs").insert({
          user_id: psychologistId,
          action_type: "request_correction",
          entity_type: "patient",
          entity_id: patientId,
          new_data: { reason: correctionText },
        });
      }

      toast.success("Solicitação enviada ao paciente");
      setCorrectionOpen(false);
      setCorrectionText("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Sem dados</p>;

  const age = data.birth_date ? differenceInYears(new Date(), new Date(data.birth_date)) : null;
  const fullAddress = [
    data.street,
    data.address_number,
    data.complement,
    data.neighborhood,
    data.city && data.state ? `${data.city}/${data.state}` : data.city || data.state,
    data.cep,
  ]
    .filter(Boolean)
    .join(", ");

  const status = data.onboarding_status;
  const statusBadge = {
    approved: { label: "🟢 Aprovado", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    review: { label: "🟡 Aguardando revisão", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    correction_requested: { label: "🔴 Correção solicitada", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
    pending: { label: "⏳ Aguardando paciente", cls: "bg-muted text-muted-foreground" },
    not_sent: { label: "📭 Cadastro não enviado", cls: "bg-muted text-muted-foreground" },
  }[status] || { label: status, cls: "bg-muted text-muted-foreground" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Status / Ações */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Status do Cadastro</CardTitle>
              <Badge className={`mt-2 ${statusBadge.cls}`} variant="outline">
                {statusBadge.label}
              </Badge>
              {data.onboarding_completed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Enviado em{" "}
                  {format(new Date(data.onboarding_completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {status !== "approved" && (
                <Button onClick={handleApprove} disabled={actionLoading} size="sm" className="gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Aprovar
                </Button>
              )}
              <Button
                onClick={() => setCorrectionOpen(true)}
                disabled={actionLoading}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Solicitar Correção
              </Button>
              {onEdit && (
                <Button onClick={onEdit} size="sm" variant="outline" className="gap-1.5">
                  <Edit className="h-4 w-4" />
                  Editar Dados
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Demanda inicial em destaque */}
      {data.initial_demand && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Demanda Inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-48 overflow-y-auto text-sm whitespace-pre-wrap">
            {data.initial_demand}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identificação */}
        <Section icon={User} title="Identificação">
          <Field label="Nome Completo" value={data.full_name} />
          <Field label="Nome Social" value={data.social_name} />
          <Field
            label="Data Nascimento"
            value={
              data.birth_date
                ? `${format(new Date(data.birth_date), "dd/MM/yyyy")}${age !== null ? ` (${age} anos)` : ""}`
                : null
            }
          />
          <Field label="Sexo" value={data.gender} />
          <Field label="Estado Civil" value={data.marital_status} />
          <Field label="Religião" value={data.religion} />
          <Field label="Naturalidade" value={data.birth_place} />
          <Field label="Profissão" value={data.profession_role || data.profession} />
          <Field label="Empresa" value={data.company} />
        </Section>

        {/* Documentos */}
        <Section icon={FileText} title="Documentos">
          <Field label="CPF" value={data.cpf} copy={data.cpf || undefined} />
          <Field label="RG" value={data.rg} copy={data.rg || undefined} />
          <Field label="Órgão Expedidor" value={data.rg_issuer} />
          <Field label="CNH" value={data.cnh} copy={data.cnh || undefined} />
        </Section>

        {/* Endereço */}
        <Section icon={MapPin} title="Endereço">
          <Field label="CEP" value={data.cep} />
          <Field label="Rua" value={data.street} />
          <Field label="Número" value={data.address_number} />
          <Field label="Complemento" value={data.complement} />
          <Field label="Bairro" value={data.neighborhood} />
          <Field label="Cidade" value={data.city} />
          <Field label="UF" value={data.state} />
          {fullAddress && (
            <Field label="Completo" value={fullAddress} copy={fullAddress} />
          )}
        </Section>

        {/* Escolaridade */}
        <Section icon={GraduationCap} title="Escolaridade">
          <Field label="Nível" value={data.education_level || data.education} />
        </Section>

        {/* Família */}
        <Section icon={Heart} title="Família">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Cônjuge</p>
                <Field label="Nome" value={data.spouse_name} />
                <Field label="Tempo de relacionamento" value={data.spouse_relationship_time} />
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Filhos</p>
                {Array.isArray(data.children) && data.children.length > 0 ? (
                  <ul className="space-y-1">
                    {data.children.map((c, i) => (
                      <li key={i} className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
                        <span>{c.name || `Filho ${i + 1}`}</span>
                        <span className="text-muted-foreground">{c.age ? `${c.age} anos` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground/60 text-sm">Nenhum filho informado</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Pais</p>
                <Field label="Pai" value={data.father_name} />
                <Field label="Profissão" value={data.father_profession} />
                <Field label="Mãe" value={data.mother_name} />
                <Field label="Profissão" value={data.mother_profession} />
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Irmãos</p>
                <Field label="Irmãos (homens)" value={data.siblings_brothers ?? null} />
                <Field label="Irmãs (mulheres)" value={data.siblings_sisters ?? null} />
              </div>
            </div>
        </Section>

        {/* Histórico Clínico */}
        <Section icon={Brain} title="Histórico Clínico">
          <Field label="Já realizou psicoterapia?" value={yesNo(data.prior_therapy)} />
          {data.prior_therapy && (
            <>
              <Field label="Quanto tempo" value={data.prior_therapy_duration} />
              <Field label="Quando" value={data.prior_therapy_when} />
              <Field label="Profissional/Motivo" value={data.prior_therapy_reason} />
            </>
          )}
        </Section>

        {/* Medicações */}
        <Section icon={Pill} title="Medicações">
          <Field label="Usa medicação?" value={yesNo(data.uses_medication)} />
          {Array.isArray(data.medications) && data.medications.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-2">Medicação</th>
                    <th className="py-2 pr-2">Dosagem</th>
                    <th className="py-2">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {data.medications.map((m, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-2 font-medium">{m.name || "—"}</td>
                      <td className="py-1.5 pr-2">{m.dose || "—"}</td>
                      <td className="py-1.5">{m.frequency || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground/60 text-sm mt-2">Nenhuma medicação registrada</p>
          )}
        </Section>

        {/* Alertas Clínicos */}
        <Section icon={AlertTriangle} title="Alertas Clínicos">
          <p className="text-xs text-muted-foreground mb-2">
            Alergias, comorbidades e observações importantes.
          </p>
          <div className="rounded-lg bg-muted/30 p-3 text-sm whitespace-pre-wrap min-h-[60px]">
            {data.notes || <span className="text-muted-foreground/60">Sem alertas registrados</span>}
          </div>
        </Section>

        {/* Emergência */}
        <Section icon={PhoneCall} title="Contato de Emergência">
          <Field label="Nome" value={data.emergency_contact} />
          <Field label="Parentesco" value={data.emergency_relationship} />
          <Field label="Telefone" value={data.emergency_phone} copy={data.emergency_phone || undefined} />
          <Field label="WhatsApp" value={data.emergency_whatsapp} copy={data.emergency_whatsapp || undefined} />
        </Section>

        {/* LGPD */}
        <Section icon={ShieldCheck} title="LGPD & Consentimentos">
          <Field label="Aceitou termos (veracidade)" value={yesNo(data.lgpd_truth_declaration)} />
          <Field label="Aceitou política de privacidade" value={yesNo(data.lgpd_privacy_consent)} />
          <Field label="Consente uso de dados" value={yesNo(data.lgpd_data_consent)} />
          <Field
            label="Autoriza gravação"
            value={
              data.recording_authorization === "yes" || data.recording_authorization === "true"
                ? yesNo(true)
                : data.recording_authorization
                ? yesNo(false)
                : null
            }
          />
        </Section>

        {/* Assinatura */}
        <Section icon={PenLine} title="Assinatura Digital">
          {data.lgpd_signature_data ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-white p-2 border">
                <img
                  src={data.lgpd_signature_data}
                  alt="Assinatura do paciente"
                  className="max-h-32 mx-auto object-contain"
                />
              </div>
              <Field
                label="Data/Hora"
                value={
                  data.signature_timestamp || data.lgpd_signed_at
                    ? format(
                        new Date(data.signature_timestamp || data.lgpd_signed_at!),
                        "dd/MM/yyyy 'às' HH:mm:ss",
                        { locale: ptBR }
                      )
                    : null
                }
              />
              <Field label="IP" value={data.signature_ip} />
              <Field label="Dispositivo" value={data.signature_device} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground/70 text-sm">
              <Clock className="h-4 w-4" />
              Assinatura ainda não capturada
            </div>
          )}
        </Section>
      </div>

      {/* Modal solicitar correção */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar correção do cadastro</DialogTitle>
            <DialogDescription>
              Descreva o que o paciente precisa corrigir. Ele será notificado no portal.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex.: CPF inválido, endereço incompleto…"
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            rows={5}
            maxLength={1000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleRequestCorrection} disabled={actionLoading}>
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
