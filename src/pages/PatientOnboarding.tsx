import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ShieldCheck, Upload, X, ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad } from "@/components/documents/SignaturePad";
import { BrandHeader } from "@/components/shared/BrandHeader";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-onboarding`;

type UploadedDoc = { name: string; path: string; type: string };
type Child = { name: string; age: string };
type Medication = { name: string; dosage: string; frequency: string };

const STEPS = [
  "Identificação",
  "Contato & Endereço",
  "Família",
  "Histórico Clínico",
  "Demanda & Documentos",
  "Consentimentos",
  "Assinatura",
];

const EDUCATION = [
  ["fund_inc", "Ensino Fundamental Incompleto"],
  ["fund_comp", "Ensino Fundamental Completo"],
  ["medio_inc", "Ensino Médio Incompleto"],
  ["medio_comp", "Ensino Médio Completo"],
  ["sup_inc", "Superior Incompleto"],
  ["sup_comp", "Superior Completo"],
  ["pos", "Pós-graduação"],
  ["mestrado", "Mestrado"],
  ["doutorado", "Doutorado"],
] as const;

export default function PatientOnboarding() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [psychologist, setPsychologist] = useState<{ full_name?: string; clinic_name?: string; logo_url?: string | null } | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({
    children: [] as Child[],
    medications: [] as Medication[],
    prior_therapy: false,
    uses_medication: false,
    lgpd_truth_declaration: false,
    lgpd_privacy_consent: false,
    lgpd_data_consent: false,
    recording_authorization: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?token=${token}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setPatient(j.patient);
        setPsychologist(j.psychologist || null);
        setForm((f) => ({ ...f, full_name: j.patient?.full_name || "" }));
      } catch (e: any) {
        setError(e.message || "Link inválido");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const u = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({ ...f, street: d.logradouro, neighborhood: d.bairro, city: d.localidade, state: d.uf }));
      }
    } catch {}
  }

  async function uploadDoc(file: File) {
    if (!patient) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo 10MB.", variant: "destructive" });
      return;
    }
    try {
      // Converte para base64 e envia via edge function (contorna RLS com segurança via token)
      const b64: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const res = await fetch(`${FUNCTION_URL}?token=${token}&action=upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ filename: file.name, content_type: file.type, data: b64 }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha no upload");
      setDocs((d) => [...d, { name: j.name, path: j.path, type: j.type }]);
      toast({ title: "Documento enviado", description: file.name });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message || "Falha no upload", variant: "destructive" });
    }
  }

  function addChild() {
    setForm((f) => ({ ...f, children: [...(f.children || []), { name: "", age: "" }] }));
  }
  function updateChild(i: number, k: keyof Child, v: string) {
    setForm((f) => {
      const arr = [...(f.children || [])];
      arr[i] = { ...arr[i], [k]: v };
      return { ...f, children: arr };
    });
  }
  function removeChild(i: number) {
    setForm((f) => ({ ...f, children: (f.children || []).filter((_: any, j: number) => j !== i) }));
  }

  function addMed() {
    setForm((f) => ({ ...f, medications: [...(f.medications || []), { name: "", dosage: "", frequency: "" }] }));
  }
  function updateMed(i: number, k: keyof Medication, v: string) {
    setForm((f) => {
      const arr = [...(f.medications || [])];
      arr[i] = { ...arr[i], [k]: v };
      return { ...f, medications: arr };
    });
  }
  function removeMed(i: number) {
    setForm((f) => ({ ...f, medications: (f.medications || []).filter((_: any, j: number) => j !== i) }));
  }

  async function submit() {
    if (!signature) {
      toast({ title: "Assinatura necessária", description: "Por favor assine para concluir.", variant: "destructive" });
      return;
    }
    if (!form.lgpd_truth_declaration || !form.lgpd_privacy_consent || !form.lgpd_data_consent) {
      toast({ title: "Consentimentos obrigatórios", description: "Marque os 3 consentimentos antes de assinar.", variant: "destructive" });
      setStep(5);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({
          ...form,
          lgpd_signature_data: signature,
          lgpd_signed_at: new Date().toISOString(),
          signature_timestamp: new Date().toISOString(),
          signature_device: navigator.userAgent,
          documents: docs,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setDone(true);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full"><CardContent className="pt-6 text-center space-y-3">
        <X className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Link inválido</h1>
        <p className="text-muted-foreground">{error}</p>
      </CardContent></Card>
    </div>
  );
  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="max-w-md w-full"><CardContent className="pt-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Cadastro enviado!</h1>
          <p className="text-muted-foreground">Suas informações foram registradas. Seu psicólogo revisará e entrará em contato em breve.</p>
        </CardContent></Card>
      </motion.div>
    </div>
  );

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <Helmet><title>Completar Cadastro — PsicoOne</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão segura · LGPD
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Olá, {patient?.full_name?.split(" ")[0]}</h1>
            <p className="text-muted-foreground text-sm mt-1">Complete sua ficha de cadastro com calma. Você pode voltar e avançar entre as etapas.</p>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base">{STEPS[step]}</CardTitle>
                <span className="text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length} · {Math.round(pct)}%</span>
              </div>
              <Progress value={pct} />
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <>
                  <Field label="Nome completo *"><Input value={form.full_name || ""} onChange={(e) => u("full_name")(e.target.value)} /></Field>
                  <Field label="Nome social (opcional)"><Input value={form.social_name || ""} onChange={(e) => u("social_name")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Data de nascimento"><Input type="date" value={form.birth_date || ""} onChange={(e) => u("birth_date")(e.target.value)} /></Field>
                    <Field label="Naturalidade"><Input value={form.birth_place || ""} onChange={(e) => u("birth_place")(e.target.value)} placeholder="Cidade de nascimento" /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Sexo / Gênero">
                      <Select value={form.gender} onValueChange={u("gender")}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="nao_binario">Não-binário</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Religião"><Input value={form.religion || ""} onChange={(e) => u("religion")(e.target.value)} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF"><Input value={form.cpf || ""} onChange={(e) => u("cpf")(e.target.value)} placeholder="000.000.000-00" /></Field>
                    <Field label="RG"><Input value={form.rg || ""} onChange={(e) => u("rg")(e.target.value)} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Órgão expedidor"><Input value={form.rg_issuer || ""} onChange={(e) => u("rg_issuer")(e.target.value)} placeholder="Ex: SSP/SP" /></Field>
                    <Field label="CNH (opcional)"><Input value={form.cnh || ""} onChange={(e) => u("cnh")(e.target.value)} /></Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tel. residencial"><Input value={form.phone_residential || ""} onChange={(e) => u("phone_residential")(e.target.value)} /></Field>
                    <Field label="Celular / WhatsApp *"><Input value={form.whatsapp_phone || form.phone || ""} onChange={(e) => { u("whatsapp_phone")(e.target.value); u("phone")(e.target.value); }} /></Field>
                  </div>
                  <Field label="E-mail"><Input type="email" value={form.email || ""} onChange={(e) => u("email")(e.target.value)} /></Field>

                  <Field label="CEP"><Input value={form.cep || ""} onChange={(e) => { u("cep")(e.target.value); fetchCep(e.target.value); }} placeholder="00000-000" /></Field>
                  <Field label="Rua"><Input value={form.street || ""} onChange={(e) => u("street")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Número"><Input value={form.address_number || ""} onChange={(e) => u("address_number")(e.target.value)} /></Field>
                    <Field label="Complemento"><Input value={form.complement || ""} onChange={(e) => u("complement")(e.target.value)} /></Field>
                  </div>
                  <Field label="Bairro"><Input value={form.neighborhood || ""} onChange={(e) => u("neighborhood")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cidade"><Input value={form.city || ""} onChange={(e) => u("city")(e.target.value)} /></Field>
                    <Field label="UF"><Input value={form.state || ""} onChange={(e) => u("state")(e.target.value)} maxLength={2} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Field label="Escolaridade">
                      <Select value={form.education_level} onValueChange={u("education_level")}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{EDUCATION.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Profissão"><Input value={form.profession || ""} onChange={(e) => u("profession")(e.target.value)} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Empresa"><Input value={form.company || ""} onChange={(e) => u("company")(e.target.value)} /></Field>
                    <Field label="Cargo"><Input value={form.profession_role || ""} onChange={(e) => u("profession_role")(e.target.value)} /></Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Estado civil">
                    <Select value={form.marital_status} onValueChange={u("marital_status")}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {["casado", "uniao_estavel"].includes(form.marital_status) && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nome do cônjuge"><Input value={form.spouse_name || ""} onChange={(e) => u("spouse_name")(e.target.value)} /></Field>
                      <Field label="Tempo de relacionamento"><Input value={form.spouse_relationship_time || ""} onChange={(e) => u("spouse_relationship_time")(e.target.value)} placeholder="Ex: 5 anos" /></Field>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Filhos</Label>
                    {(form.children || []).map((c: Child, i: number) => (
                      <div key={i} className="flex gap-2">
                        <Input placeholder="Nome" value={c.name} onChange={(e) => updateChild(i, "name", e.target.value)} />
                        <Input placeholder="Idade" className="w-24" value={c.age} onChange={(e) => updateChild(i, "age", e.target.value)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChild(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addChild} className="gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar filho</Button>
                  </div>

                  <div className="pt-2 space-y-3">
                    <Label className="text-xs font-medium">Pai</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Nome" value={form.father_name || ""} onChange={(e) => u("father_name")(e.target.value)} />
                      <Input placeholder="Profissão" value={form.father_profession || ""} onChange={(e) => u("father_profession")(e.target.value)} />
                    </div>
                    <Label className="text-xs font-medium">Mãe</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Nome" value={form.mother_name || ""} onChange={(e) => u("mother_name")(e.target.value)} />
                      <Input placeholder="Profissão" value={form.mother_profession || ""} onChange={(e) => u("mother_profession")(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantos irmãos"><Input type="number" min={0} value={form.siblings_brothers ?? ""} onChange={(e) => u("siblings_brothers")(e.target.value ? Number(e.target.value) : null)} /></Field>
                    <Field label="Quantas irmãs"><Input type="number" min={0} value={form.siblings_sisters ?? ""} onChange={(e) => u("siblings_sisters")(e.target.value ? Number(e.target.value) : null)} /></Field>
                  </div>

                  <div className="pt-2 space-y-3">
                    <Label className="text-xs font-medium">Contato de emergência</Label>
                    <Input placeholder="Nome" value={form.emergency_contact || ""} onChange={(e) => u("emergency_contact")(e.target.value)} />
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Parentesco" value={form.emergency_relationship || ""} onChange={(e) => u("emergency_relationship")(e.target.value)} />
                      <Input placeholder="Telefone" value={form.emergency_phone || ""} onChange={(e) => u("emergency_phone")(e.target.value)} />
                      <Input placeholder="WhatsApp" value={form.emergency_whatsapp || ""} onChange={(e) => u("emergency_whatsapp")(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Field label="Já realizou psicoterapia anteriormente?">
                    <RadioGroup value={form.prior_therapy ? "sim" : "nao"} onValueChange={(v) => u("prior_therapy")(v === "sim")} className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="sim" /> Sim</label>
                      <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="nao" /> Não</label>
                    </RadioGroup>
                  </Field>
                  {form.prior_therapy && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Quanto tempo?"><Input value={form.prior_therapy_duration || ""} onChange={(e) => u("prior_therapy_duration")(e.target.value)} placeholder="Ex: 2 anos" /></Field>
                        <Field label="Quando?"><Input value={form.prior_therapy_when || ""} onChange={(e) => u("prior_therapy_when")(e.target.value)} placeholder="Ex: 2022-2024" /></Field>
                      </div>
                      <Field label="Motivo principal"><Textarea rows={2} value={form.prior_therapy_reason || ""} onChange={(e) => u("prior_therapy_reason")(e.target.value)} /></Field>
                    </>
                  )}

                  <Field label="Faz uso de medicação?">
                    <RadioGroup value={form.uses_medication ? "sim" : "nao"} onValueChange={(v) => u("uses_medication")(v === "sim")} className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="sim" /> Sim</label>
                      <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="nao" /> Não</label>
                    </RadioGroup>
                  </Field>
                  {form.uses_medication && (
                    <div className="space-y-2">
                      {(form.medications || []).map((m: Medication, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_100px_120px_auto] gap-2">
                          <Input placeholder="Medicamento" value={m.name} onChange={(e) => updateMed(i, "name", e.target.value)} />
                          <Input placeholder="Dosagem" value={m.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
                          <Input placeholder="Frequência" value={m.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeMed(i)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addMed} className="gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar medicação</Button>
                    </div>
                  )}

                  <Field label="Convênio (opcional)"><Input value={form.health_plan || ""} onChange={(e) => u("health_plan")(e.target.value)} placeholder="Ex: Unimed" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Carteirinha"><Input value={form.health_plan_id || ""} onChange={(e) => u("health_plan_id")(e.target.value)} /></Field>
                    <Field label="Validade"><Input type="date" value={form.health_plan_expiry || ""} onChange={(e) => u("health_plan_expiry")(e.target.value)} /></Field>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <Field label="Qual o motivo da procura por atendimento psicológico? *">
                    <Textarea rows={5} value={form.initial_demand || ""} onChange={(e) => u("initial_demand")(e.target.value)} placeholder="Conte com suas palavras o que te trouxe até aqui..." />
                  </Field>
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Documentos e anexos (RG, CPF, convênio, encaminhamentos, laudos)</Label>
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clique ou arraste arquivos</span>
                      <input type="file" multiple className="hidden" onChange={(e) => Array.from(e.target.files || []).forEach(uploadDoc)} />
                    </label>
                    {docs.length > 0 && (
                      <ul className="space-y-2">
                        {docs.map((d, i) => (
                          <li key={i} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm">
                            <span className="truncate">{d.name}</span>
                            <button onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))} className="text-destructive"><X className="h-4 w-4" /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2 max-h-56 overflow-y-auto">
                    <p className="font-semibold">Termo de Consentimento (LGPD — Lei 13.709/2018)</p>
                    <p className="text-muted-foreground">Autorizo o tratamento dos meus dados pessoais e de saúde pelo profissional responsável, exclusivamente para fins de atendimento clínico, prontuário e comunicação. Meus dados serão mantidos em sigilo profissional conforme o Código de Ética da Psicologia.</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={form.lgpd_truth_declaration} onCheckedChange={(c) => u("lgpd_truth_declaration")(!!c)} />
                    <span className="text-sm">Declaro que as informações fornecidas são <b>verdadeiras</b>.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={form.lgpd_privacy_consent} onCheckedChange={(c) => u("lgpd_privacy_consent")(!!c)} />
                    <span className="text-sm">Concordo com a <b>Política de Privacidade</b>.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={form.lgpd_data_consent} onCheckedChange={(c) => u("lgpd_data_consent")(!!c)} />
                    <span className="text-sm">Autorizo o <b>tratamento dos meus dados</b> conforme a LGPD.</span>
                  </label>

                  <div className="pt-2 space-y-2">
                    <Label className="text-xs font-medium">Autorização de gravação de áudio das sessões</Label>
                    <RadioGroup value={form.recording_authorization} onValueChange={u("recording_authorization")} className="space-y-2">
                      <label className="flex items-start gap-3 text-sm cursor-pointer"><RadioGroupItem value="autorizo" className="mt-0.5" /> Autorizo a gravação em áudio das sessões</label>
                      <label className="flex items-start gap-3 text-sm cursor-pointer"><RadioGroupItem value="nao_autorizo" className="mt-0.5" /> Não autorizo a gravação em áudio das sessões</label>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground mt-2">A gravação, quando utilizada, será armazenada de forma segura e utilizada exclusivamente para fins terapêuticos e administrativos, respeitando sigilo profissional e LGPD.</p>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Assine no quadro abaixo para concluir</Label>
                  <SignaturePad onSignatureChange={setSignature} initialSignature={signature} />
                  <p className="text-xs text-muted-foreground">Sua assinatura será registrada com data, hora, IP e dispositivo, com validade conforme LGPD e MP 2.200-2/2001.</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => setStep((s) => s + 1)} className="ml-auto gap-2">
                    Próximo <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={submitting} className="ml-auto gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Concluir cadastro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
