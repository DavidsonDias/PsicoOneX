import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Receipt, FileCheck, ClipboardList, Download, Printer, Save, AlertCircle, Sparkles, History, Layers } from "lucide-react";
import { SignaturePad } from "@/components/documents/SignaturePad";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentTemplates } from "@/components/documents/DocumentTemplates";
import { DocumentHistory } from "@/components/documents/DocumentHistory";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsOverview } from "@/components/ui/stats-overview";

interface Patient {
  id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  crp: string | null;
  clinic_name: string | null;
  logo_url: string | null;
}

type DocumentType = "receipt" | "declaration" | "certificate" | "report";

export default function Documentos() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [documentType, setDocumentType] = useState<DocumentType>("receipt");
  const [signature, setSignature] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [patientError, setPatientError] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "templates" | "history">("create");
  
  const [formData, setFormData] = useState({
    value: 0,
    sessionCount: 1,
    content: "",
    date: new Date().toISOString().split("T")[0],
    clinicName: "",
  });

  // Stats mock data
  const documentStats = {
    total: 47,
    thisMonth: 12,
    signed: 38,
    pending: 9,
  };

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, crp, clinic_name, logo_url")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setFormData(prev => ({ ...prev, clinicName: profileData.clinic_name || "" }));
      setProfile(profileData);
    }

    const { data: patientsData } = await supabase
      .from("patients")
      .select("id, full_name, cpf, email")
      .eq("psychologist_id", user.id)
      .order("full_name");

    if (patientsData) setPatients(patientsData);

    const saved = localStorage.getItem(`signature_${user.id}`);
    if (saved) {
      setSavedSignature(saved);
      setSignature(saved);
    }

    setLoading(false);
  };

  const handleSignatureChange = (sig: string | null) => setSignature(sig);

  const saveSignature = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !signature) return;

    localStorage.setItem(`signature_${user.id}`, signature);
    setSavedSignature(signature);
    toast.success("Assinatura salva!");
  };

  const getSelectedPatient = () => patients.find(p => p.id === selectedPatient);

  const getDocumentData = () => {
    const patient = getSelectedPatient();
    return {
      patientName: patient?.full_name || "Selecione um paciente",
      patientCpf: patient?.cpf || undefined,
      professionalName: profile?.full_name || "Nome do Profissional",
      professionalCrp: profile?.crp || "00/00000",
      clinicName: formData.clinicName || undefined,
      logoUrl: profile?.logo_url || null,
      value: formData.value,
      date: new Date(formData.date),
      sessionCount: formData.sessionCount,
      content: formData.content,
      signature: signature,
    };
  };

  const validateDocument = () => {
    if (!selectedPatient) {
      setPatientError(true);
      toast.error("Selecione um paciente");
      return false;
    }
    setPatientError(false);
    return true;
  };

  const openPrintFrame = () => {
    const printContent = document.getElementById("document-preview");
    if (!printContent) return;

    // Pull page-level styles (Tailwind, fonts) so the printed doc matches preview.
    const styleTags = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((el) => el.outerHTML)
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Documento - PsicoOne</title>
    ${styleTags}
    <style>
      @page { size: A4; margin: 20mm; }
      html, body { background: #ffffff !important; color: #0f172a !important; font-family: 'Times New Roman', Georgia, serif; }
      body { padding: 0; margin: 0; }
      .print-shell { max-width: 800px; margin: 0 auto; padding: 24px; }
      #document-preview { box-shadow: none !important; border: none !important; }
      img { max-height: 120px; }
    </style>
  </head>
  <body>
    <div class="print-shell">${printContent.innerHTML}</div>
  </body>
</html>`;

    // Use a hidden iframe (avoids popup blockers that break window.open).
    const existing = document.getElementById("__print_frame__") as HTMLIFrameElement | null;
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__print_frame__";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error("Não foi possível preparar a impressão");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for the iframe to render (fonts + images) before printing.
    const trigger = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("print error", err);
        toast.error("Falha ao imprimir. Tente novamente.");
      }
    };
    if (iframe.contentWindow?.document.readyState === "complete") {
      setTimeout(trigger, 400);
    } else {
      iframe.onload = () => setTimeout(trigger, 400);
    }
  };

  const handlePrint = () => {
    if (!validateDocument()) return;
    openPrintFrame();
  };

  const handleDownloadPDF = () => {
    if (!validateDocument()) return;
    openPrintFrame();
    toast.info("Escolha 'Salvar como PDF' na janela de impressão");
  };

  const handleSelectTemplate = (template: any) => {
    // Map template to document type
    if (template.category === "Recibo") setDocumentType("receipt");
    else if (template.category === "Declaração") setDocumentType("declaration");
    else if (template.category === "Atestado") setDocumentType("certificate");
    else setDocumentType("report");
    
    setActiveTab("create");
    toast.success(`Template "${template.name}" selecionado`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-primary">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Central de Documentos" description="Emita recibos, declarações e documentos personalizados com assinatura digital">
      {/* Stats Overview */}
      <StatsOverview
        stats={[
          {
            label: "Total de Documentos",
            value: documentStats.total,
            icon: FileText,
            color: "blue",
            change: 15,
          },
          {
            label: "Emitidos este Mês",
            value: documentStats.thisMonth,
            icon: Layers,
            color: "purple",
            change: 8,
          },
          {
            label: "Documentos Assinados",
            value: documentStats.signed,
            icon: FileCheck,
            color: "green",
            change: 12,
          },
          {
            label: "Pendentes de Assinatura",
            value: documentStats.pending,
            icon: History,
            color: "amber",
          },
        ]}
        className="mb-6"
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="create" className="gap-2">
            <FileText className="h-4 w-4" />
            Criar Documento
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "templates" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DocumentTemplates onSelectTemplate={handleSelectTemplate} />
        </motion.div>
      ) : activeTab === "history" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DocumentHistory />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Configurar Documento
                </CardTitle>
                <CardDescription>Selecione o tipo de documento e preencha as informações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="receipt" className="gap-1 text-xs">
                      <Receipt className="h-3 w-3" />Recibo
                    </TabsTrigger>
                    <TabsTrigger value="declaration" className="gap-1 text-xs">
                      <FileCheck className="h-3 w-3" />Declaração
                    </TabsTrigger>
                    <TabsTrigger value="certificate" className="gap-1 text-xs">
                      <FileText className="h-3 w-3" />Atestado
                    </TabsTrigger>
                    <TabsTrigger value="report" className="gap-1 text-xs">
                      <ClipboardList className="h-3 w-3" />Relatório
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div>
                  <Label className="flex items-center gap-1">
                    Paciente <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={selectedPatient} 
                    onValueChange={(v) => { setSelectedPatient(v); setPatientError(false); }}
                  >
                    <SelectTrigger className={`mt-1 ${patientError ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Selecione um paciente (obrigatório)" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {patientError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Selecione um paciente
                    </p>
                  )}
                </div>

                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Nome da Clínica (opcional)</Label>
                  <Input
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    placeholder="Ex: Clínica de Psicologia"
                    className="mt-1"
                  />
                </div>

                {documentType === "receipt" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Nº de Sessões</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.sessionCount}
                        onChange={(e) => setFormData({ ...formData, sessionCount: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {(documentType === "certificate" || documentType === "report") && (
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder={documentType === "certificate" ? "Descreva a situação clínica..." : "Escreva o relatório..."}
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assinatura Digital</CardTitle>
                <CardDescription>Desenhe sua assinatura ou use a salva</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignaturePad onSignatureChange={handleSignatureChange} initialSignature={savedSignature} />
                <Button variant="outline" size="sm" onClick={saveSignature} disabled={!signature} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar como padrão
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pré-visualização</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button size="sm" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>

            <DocumentPreview type={documentType} data={getDocumentData()} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
