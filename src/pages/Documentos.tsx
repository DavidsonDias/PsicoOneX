import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Receipt, FileCheck, ClipboardList, Download, Printer, Save, AlertCircle } from "lucide-react";
import { SignaturePad } from "@/components/documents/SignaturePad";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { AppLayout } from "@/components/layout/AppLayout";

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
  
  const [formData, setFormData] = useState({
    value: 0,
    sessionCount: 1,
    content: "",
    date: new Date().toISOString().split("T")[0],
    clinicName: "",
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, crp, clinic_name")
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

  const handlePrint = () => {
    if (!validateDocument()) return;

    const printContent = document.getElementById("document-preview");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Documento - PsicoOne</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a2e; }
            h2 { text-align: center; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 32px; }
            p { line-height: 1.8; text-align: justify; }
            .signature-area { margin-top: 60px; text-align: center; }
            .signature-line { width: 300px; border-bottom: 1px solid #1a1a2e; margin: 0 auto 8px; }
            img { max-height: 80px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleDownloadPDF = () => {
    if (!validateDocument()) return;
    handlePrint();
    toast.info("Use 'Salvar como PDF' na janela de impressão");
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
    <AppLayout title="Documentos" description="Emita recibos, declarações e documentos personalizados">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
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
    </AppLayout>
  );
}
