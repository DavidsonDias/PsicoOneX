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
import { jsPDF } from "jspdf";
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

type PdfImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatLongDate = (date: Date) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatShortDate = (date: Date) => {
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const extenso = (valor: number) => {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (valor === 0) return "zero reais";
  if (valor === 100) return "cem reais";

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  let resultado = "";

  if (inteiro >= 100) {
    resultado += centenas[Math.floor(inteiro / 100)] || "";
    const restoCentena = inteiro % 100;
    if (restoCentena > 0) resultado += " e ";
  }

  const resto = inteiro % 100;
  if (resto >= 10 && resto <= 19) {
    resultado += teens[resto - 10];
  } else if (resto >= 20) {
    resultado += dezenas[Math.floor(resto / 10)];
    if (resto % 10 > 0) resultado += ` e ${unidades[resto % 10]}`;
  } else if (resto > 0) {
    resultado += unidades[resto];
  }

  resultado += inteiro === 1 ? " real" : " reais";

  if (centavos > 0) {
    resultado += " e ";
    if (centavos >= 10 && centavos <= 19) {
      resultado += teens[centavos - 10];
    } else if (centavos >= 20) {
      resultado += dezenas[Math.floor(centavos / 10)];
      if (centavos % 10 > 0) resultado += ` e ${unidades[centavos % 10]}`;
    } else {
      resultado += unidades[centavos];
    }
    resultado += centavos === 1 ? " centavo" : " centavos";
  }

  return resultado;
};

const blobToDataUrl = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Imagem inválida"));
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(blob);
  });
};

const loadImageElement = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar imagem"));
    image.src = src;
  });
};

const loadPdfImage = async (src?: string | null): Promise<PdfImage | null> => {
  if (!src) return null;

  try {
    let dataUrl = src;
    if (!src.startsWith("data:")) {
      const response = await fetch(src, { mode: "cors", credentials: "omit" });
      if (!response.ok) return null;
      dataUrl = await blobToDataUrl(await response.blob());
    }

    const image = await loadImageElement(dataUrl);
    const width = image.naturalWidth || image.width || 1;
    const height = image.naturalHeight || image.height || 1;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width,
      height,
    };
  } catch (error) {
    console.warn("Não foi possível embutir a imagem no PDF", error);
    return null;
  }
};

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

  const handlePrint = () => {
    if (!validateDocument()) return;
    document.body.classList.add("print-document-only");
    const cleanup = () => document.body.classList.remove("print-document-only");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 1000);
    }, 80);
  };

  const handleDownloadPDF = async () => {
    if (!validateDocument()) return;

    toast.loading("Gerando PDF...", { id: "document-pdf" });
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 22;
      const contentWidth = pageWidth - margin * 2;
      const documentData = getDocumentData();
      const logo = await loadPdfImage(documentData.logoUrl);
      const signatureImage = await loadPdfImage(documentData.signature);
      let cursorY = 18;

      const addPageIfNeeded = (requiredHeight = 12) => {
        if (cursorY + requiredHeight <= pageHeight - margin) return;
        pdf.addPage();
        cursorY = margin;
      };

      const drawCenteredText = (text: string, y: number, size = 10, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(15, 23, 42);
        pdf.text(text, pageWidth / 2, y, { align: "center" });
      };

      const drawParagraph = (text: string, options?: { fontSize?: number; lineHeight?: number; indent?: number }) => {
        const fontSize = options?.fontSize || 11;
        const lineHeight = options?.lineHeight || 7;
        const indent = options?.indent || 0;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(15, 23, 42);
        const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[];
        lines.forEach((line) => {
          addPageIfNeeded(lineHeight);
          pdf.text(line, margin + indent, cursorY);
          cursorY += lineHeight;
        });
      };

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      if (logo) {
        const maxLogoWidth = 34;
        const maxLogoHeight = 26;
        const ratio = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
        const logoWidth = logo.width * ratio;
        const logoHeight = logo.height * ratio;
        pdf.addImage(logo.dataUrl, "PNG", (pageWidth - logoWidth) / 2, cursorY, logoWidth, logoHeight);
        cursorY += logoHeight + 4;
      }

      if (documentData.clinicName) {
        drawCenteredText(documentData.clinicName, cursorY + 3, 10, true);
        cursorY += 10;
      }

      const titleByType: Record<DocumentType, string> = {
        receipt: "RECIBO DE PAGAMENTO",
        declaration: "DECLARAÇÃO DE COMPARECIMENTO",
        certificate: "ATESTADO PSICOLÓGICO",
        report: "RELATÓRIO PSICOLÓGICO",
      };

      cursorY += 3;
      pdf.setDrawColor(148, 163, 184);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 11;
      drawCenteredText(titleByType[documentType], cursorY, 13, true);
      cursorY += 12;

      if (documentType === "receipt") {
        drawParagraph(
          `Recebi de ${documentData.patientName}${documentData.patientCpf ? ` (CPF: ${documentData.patientCpf})` : ""}, a quantia de ${formatCurrency(documentData.value || 0)} (${extenso(documentData.value || 0)}), referente a ${documentData.sessionCount || 1} sessão(ões) de atendimento psicológico.`
        );
        cursorY += 13;
        pdf.text(`Local, ${formatLongDate(documentData.date)}`, pageWidth - margin, cursorY, { align: "right" });
      } else if (documentType === "declaration") {
        drawParagraph(
          `Declaro, para os devidos fins, que ${documentData.patientName}${documentData.patientCpf ? ` (CPF: ${documentData.patientCpf})` : ""} compareceu à sessão de atendimento psicológico nesta data.`
        );
        cursorY += 4;
        drawParagraph(`Data do atendimento: ${formatShortDate(documentData.date)}`);
        cursorY += 10;
        pdf.text(`Local, ${formatLongDate(new Date())}`, pageWidth - margin, cursorY, { align: "right" });
      } else if (documentType === "certificate") {
        drawParagraph(
          `Atesto, para os devidos fins, que ${documentData.patientName}${documentData.patientCpf ? ` (CPF: ${documentData.patientCpf})` : ""} encontra-se em acompanhamento psicológico desde ${formatShortDate(documentData.date)}.`
        );
        if (documentData.content) {
          cursorY += 6;
          drawParagraph(documentData.content);
        }
        cursorY += 10;
        pdf.text(`Local, ${formatLongDate(new Date())}`, pageWidth - margin, cursorY, { align: "right" });
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.text("Paciente:", margin, cursorY);
        cursorY += 6;
        pdf.setFont("helvetica", "normal");
        pdf.text(documentData.patientName, margin, cursorY);
        cursorY += 6;
        if (documentData.patientCpf) {
          pdf.setTextColor(71, 85, 105);
          pdf.text(`CPF: ${documentData.patientCpf}`, margin, cursorY);
          pdf.setTextColor(15, 23, 42);
          cursorY += 8;
        }
        pdf.setFont("helvetica", "bold");
        pdf.text("Data de Emissão:", margin, cursorY);
        cursorY += 6;
        pdf.setFont("helvetica", "normal");
        pdf.text(formatShortDate(new Date()), margin, cursorY);
        cursorY += 10;
        if (documentData.content) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Conteúdo:", margin, cursorY);
          cursorY += 7;
          drawParagraph(documentData.content);
        }
      }

      cursorY = Math.max(cursorY + 25, pageHeight - 72);
      addPageIfNeeded(44);
      pdf.setDrawColor(148, 163, 184);
      pdf.line(margin + 35, cursorY, pageWidth - margin - 35, cursorY);
      cursorY += 8;

      if (signatureImage) {
        const maxSignatureWidth = 42;
        const maxSignatureHeight = 16;
        const ratio = Math.min(maxSignatureWidth / signatureImage.width, maxSignatureHeight / signatureImage.height);
        const signatureWidth = signatureImage.width * ratio;
        const signatureHeight = signatureImage.height * ratio;
        pdf.addImage(signatureImage.dataUrl, "PNG", (pageWidth - signatureWidth) / 2, cursorY - signatureHeight - 4, signatureWidth, signatureHeight);
      }

      drawCenteredText(documentData.professionalName, cursorY, 10, true);
      cursorY += 6;
      drawCenteredText(`Psicólogo(a) - CRP ${documentData.professionalCrp}`, cursorY, 9);

      const patient = getSelectedPatient();
      const filename = `${documentType}-${patient?.full_name || "documento"}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      pdf.save(`${filename || "documento"}.pdf`);
      toast.success("PDF baixado com sucesso", { id: "document-pdf" });
    } catch (err) {
      console.error("pdf error", err);
      toast.error("Falha ao gerar PDF. Tente imprimir e escolher Salvar como PDF.", { id: "document-pdf" });
    }
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
