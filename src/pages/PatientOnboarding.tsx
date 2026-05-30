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
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ShieldCheck, Upload, X, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/patient-onboarding`;

type UploadedDoc = { name: string; path: string; type: string };

const STEPS = ["Pessoal", "Contato", "Endereço", "Profissional", "Emergência", "Convênio", "Documentos", "Assinatura LGPD"];

export default function PatientOnboarding() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [signature, setSignature] = useState<string>("");
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FUNCTION_URL}?token=${token}`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setPatient(j.patient);
        setForm({ full_name: j.patient?.full_name || "" });
      } catch (e: any) {
        setError(e.message || "Link inválido");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          street: d.logradouro,
          neighborhood: d.bairro,
          city: d.localidade,
          state: d.uf,
        }));
      }
    } catch {}
  }

  async function uploadDoc(file: File) {
    if (!patient) return;
    const path = `${patient.id}/${Date.now()}_${file.name}`;
    const { error: e } = await supabase.storage.from("patient-documents").upload(path, file);
    if (e) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
      return;
    }
    setDocs((d) => [...d, { name: file.name, path, type: file.type }]);
  }

  async function submit() {
    if (!signature) {
      toast({ title: "Assinatura necessária", description: "Assine o termo LGPD para concluir.", variant: "destructive" });
      setStep(7);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          ...form,
          lgpd_signature_data: signature,
          lgpd_signed_at: new Date().toISOString(),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <X className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Link inválido</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold">Cadastro enviado!</h1>
              <p className="text-muted-foreground">
                Suas informações foram enviadas com sucesso ao seu psicólogo. Em breve ele revisará tudo.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const u = (k: string) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Helmet><title>Completar Cadastro — PsicoOne</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão segura
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Olá, {patient?.full_name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Complete seus dados para que seu psicólogo possa atendê-lo melhor.</p>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base">{STEPS[step]}</CardTitle>
                <span className="text-xs text-muted-foreground">{step + 1} de {STEPS.length}</span>
              </div>
              <Progress value={((step + 1) / STEPS.length) * 100} />
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 0 && (
                <>
                  <Field label="Nome completo *"><Input value={form.full_name || ""} onChange={(e) => u("full_name")(e.target.value)} /></Field>
                  <Field label="CPF"><Input value={form.cpf || ""} onChange={(e) => u("cpf")(e.target.value)} placeholder="000.000.000-00" /></Field>
                  <Field label="RG"><Input value={form.rg || ""} onChange={(e) => u("rg")(e.target.value)} /></Field>
                  <Field label="Data de nascimento"><Input type="date" value={form.birth_date || ""} onChange={(e) => u("birth_date")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Gênero">
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
                    <Field label="Estado civil">
                      <Select value={form.marital_status} onValueChange={u("marital_status")}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                          <SelectItem value="casado">Casado(a)</SelectItem>
                          <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                          <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          <SelectItem value="uniao_estavel">União estável</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="Telefone"><Input value={form.phone || ""} onChange={(e) => u("phone")(e.target.value)} /></Field>
                  <Field label="WhatsApp"><Input value={form.whatsapp_phone || ""} onChange={(e) => u("whatsapp_phone")(e.target.value)} /></Field>
                  <Field label="E-mail"><Input type="email" value={form.email || ""} onChange={(e) => u("email")(e.target.value)} /></Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="CEP">
                    <Input value={form.cep || ""} onChange={(e) => { u("cep")(e.target.value); fetchCep(e.target.value); }} placeholder="00000-000" />
                  </Field>
                  <Field label="Rua"><Input value={form.street || ""} onChange={(e) => u("street")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Número"><Input value={form.address_number || ""} onChange={(e) => u("address_number")(e.target.value)} /></Field>
                    <Field label="Complemento"><Input value={form.complement || ""} onChange={(e) => u("complement")(e.target.value)} /></Field>
                  </div>
                  <Field label="Bairro"><Input value={form.neighborhood || ""} onChange={(e) => u("neighborhood")(e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cidade"><Input value={form.city || ""} onChange={(e) => u("city")(e.target.value)} /></Field>
                    <Field label="Estado"><Input value={form.state || ""} onChange={(e) => u("state")(e.target.value)} maxLength={2} /></Field>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Field label="Profissão"><Input value={form.profession || ""} onChange={(e) => u("profession")(e.target.value)} /></Field>
                  <Field label="Empresa"><Input value={form.company || ""} onChange={(e) => u("company")(e.target.value)} /></Field>
                  <Field label="Escolaridade">
                    <Select value={form.education} onValueChange={u("education")}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fundamental">Fundamental</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="superior">Superior</SelectItem>
                        <SelectItem value="pos">Pós-graduação</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              {step === 4 && (
                <>
                  <Field label="Nome do contato"><Input value={form.emergency_contact || ""} onChange={(e) => u("emergency_contact")(e.target.value)} /></Field>
                  <Field label="Parentesco"><Input value={form.emergency_relationship || ""} onChange={(e) => u("emergency_relationship")(e.target.value)} /></Field>
                  <Field label="Telefone"><Input value={form.emergency_phone || ""} onChange={(e) => u("emergency_phone")(e.target.value)} /></Field>
                </>
              )}

              {step === 5 && (
                <>
                  <Field label="Convênio"><Input value={form.health_plan || ""} onChange={(e) => u("health_plan")(e.target.value)} placeholder="Ex: Unimed, Bradesco Saúde" /></Field>
                  <Field label="Número da carteirinha"><Input value={form.health_plan_id || ""} onChange={(e) => u("health_plan_id")(e.target.value)} /></Field>
                  <Field label="Validade"><Input type="date" value={form.health_plan_expiry || ""} onChange={(e) => u("health_plan_expiry")(e.target.value)} /></Field>
                </>
              )}

              {step === 6 && (
                <div className="space-y-3">
                  <Label>Envie seus documentos (RG, CPF, CNH, carteirinha)</Label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique ou arraste arquivos</span>
                    <input type="file" multiple className="hidden" onChange={(e) => {
                      Array.from(e.target.files || []).forEach(uploadDoc);
                    }} />
                  </label>
                  {docs.length > 0 && (
                    <ul className="space-y-2">
                      {docs.map((d, i) => (
                        <li key={i} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm">
                          <span className="truncate">{d.name}</span>
                          <button onClick={() => setDocs((arr) => arr.filter((_, j) => j !== i))} className="text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-2 max-h-48 overflow-y-auto">
                    <p className="font-semibold">Termo de Consentimento LGPD</p>
                    <p className="text-muted-foreground">
                      Autorizo o tratamento dos meus dados pessoais e de saúde pelo profissional responsável, conforme a Lei 13.709/2018 (LGPD),
                      exclusivamente para fins de atendimento clínico, prontuário e comunicação. Meus dados serão mantidos em sigilo profissional
                      conforme o Código de Ética da Psicologia.
                    </p>
                  </div>
                  <Field label="Assine abaixo (digite seu nome completo como assinatura digital)">
                    <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Seu nome completo" className="font-serif italic text-lg" />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    Ao concluir, sua assinatura será registrada com data, hora e IP para fins de comprovação.
                  </p>
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
