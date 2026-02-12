import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle2, AlertCircle, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

interface ParsedPatient {
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  address: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
}

interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  validRows: ParsedPatient[];
  summary: { total: number; valid: number; errors: number; duplicates: number };
}

function normalizeHeader(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalized = headers.map(h => h ? normalizeHeader(String(h)) : "");
  const names = possibleNames.map(normalizeHeader);
  for (const name of names) {
    const idx = normalized.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of names) {
    const idx = normalized.findIndex(h => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," || char === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

interface PatientImportCSVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingPatients: { full_name: string; email: string | null; cpf: string | null }[];
}

export function PatientImportCSV({ open, onOpenChange, onImportComplete, existingPatients }: PatientImportCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const reset = () => {
    setFile(null);
    setValidation(null);
    setStep("upload");
    setImportResult(null);
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setFile(f);
    const text = await f.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      toast.error("Arquivo vazio ou sem dados");
      return;
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map columns
    const nameIdx = findColumnIndex(headers, ["nome", "nome completo", "full name", "name", "full_name"]);
    const emailIdx = findColumnIndex(headers, ["email", "e-mail"]);
    const phoneIdx = findColumnIndex(headers, ["telefone", "phone", "celular", "tel"]);
    const cpfIdx = findColumnIndex(headers, ["cpf"]);
    const birthIdx = findColumnIndex(headers, ["nascimento", "data nascimento", "birth date", "birth_date", "data de nascimento"]);
    const addressIdx = findColumnIndex(headers, ["endereco", "address"]);
    const emergencyIdx = findColumnIndex(headers, ["contato emergencia", "emergency contact", "emergency_contact"]);
    const emergencyPhoneIdx = findColumnIndex(headers, ["telefone emergencia", "emergency phone", "emergency_phone"]);
    const notesIdx = findColumnIndex(headers, ["observacoes", "notes", "notas", "obs"]);

    if (nameIdx === -1) {
      toast.error("Coluna 'Nome' não encontrada no arquivo");
      return;
    }

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const validRows: ParsedPatient[] = [];
    let duplicates = 0;

    const existingEmails = new Set(existingPatients.filter(p => p.email).map(p => p.email!.toLowerCase()));
    const existingCpfs = new Set(existingPatients.filter(p => p.cpf).map(p => p.cpf!.replace(/\D/g, "")));
    const existingNames = new Set(existingPatients.map(p => p.full_name.toLowerCase().trim()));

    dataRows.forEach((row, index) => {
      const rowNum = index + 2;
      const name = row[nameIdx]?.trim();

      if (!name) {
        errors.push({ row: rowNum, field: "Nome", message: "Nome é obrigatório" });
        return;
      }

      const email = emailIdx !== -1 ? row[emailIdx]?.trim() || null : null;
      const cpf = cpfIdx !== -1 ? row[cpfIdx]?.trim() || null : null;

      // Check duplicates
      let isDuplicate = false;
      if (email && existingEmails.has(email.toLowerCase())) {
        warnings.push({ row: rowNum, field: "Email", message: `Duplicado: ${email}` });
        isDuplicate = true;
      }
      if (cpf && existingCpfs.has(cpf.replace(/\D/g, ""))) {
        warnings.push({ row: rowNum, field: "CPF", message: `Duplicado: ${cpf}` });
        isDuplicate = true;
      }
      if (existingNames.has(name.toLowerCase())) {
        warnings.push({ row: rowNum, field: "Nome", message: `Possível duplicado: ${name}` });
        isDuplicate = true;
      }
      if (isDuplicate) duplicates++;

      // Email validation
      if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push({ row: rowNum, field: "Email", message: `Email inválido: ${email}` });
        return;
      }

      validRows.push({
        full_name: name,
        email: email || null,
        phone: phoneIdx !== -1 ? row[phoneIdx]?.trim() || null : null,
        cpf: cpf || null,
        birth_date: birthIdx !== -1 ? row[birthIdx]?.trim() || null : null,
        address: addressIdx !== -1 ? row[addressIdx]?.trim() || null : null,
        emergency_contact: emergencyIdx !== -1 ? row[emergencyIdx]?.trim() || null : null,
        emergency_phone: emergencyPhoneIdx !== -1 ? row[emergencyPhoneIdx]?.trim() || null : null,
        notes: notesIdx !== -1 ? row[notesIdx]?.trim() || null : null,
      });
    });

    setValidation({
      errors,
      warnings,
      validRows,
      summary: { total: dataRows.length, valid: validRows.length, errors: errors.length, duplicates },
    });
    setStep("preview");
  }, [existingPatients]);

  const handleImport = async () => {
    if (!validation || validation.validRows.length === 0) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // Batch insert in chunks of 50
      const chunks = [];
      for (let i = 0; i < validation.validRows.length; i += 50) {
        chunks.push(validation.validRows.slice(i, i + 50));
      }

      for (const chunk of chunks) {
        const records = chunk.map(p => ({
          psychologist_id: session.user.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          cpf: p.cpf,
          birth_date: p.birth_date,
          address: p.address,
          emergency_contact: p.emergency_contact,
          emergency_phone: p.emergency_phone,
          notes: p.notes,
        }));

        const { error, data } = await supabase.from("patients").insert(records).select();
        if (error) {
          failed += chunk.length;
          console.error("Import batch error:", error);
        } else {
          success += data.length;
        }
      }

      setImportResult({ success, failed });
      setStep("done");

      if (success > 0) {
        toast.success(`${success} pacientes importados com sucesso!`);
        onImportComplete();
      }
      if (failed > 0) {
        toast.error(`${failed} registros falharam na importação`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro durante a importação");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "Nome,Email,Telefone,CPF,Data de Nascimento,Endereço,Contato Emergência,Telefone Emergência,Observações\nJoão Silva,joao@email.com,(11) 99999-0000,123.456.789-00,1990-01-15,Rua Exemplo 123,Maria Silva,(11) 98888-0000,Paciente regular";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_pacientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Pacientes
          </DialogTitle>
          <DialogDescription>
            Importe pacientes em massa a partir de um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-160px)]">
          {step === "upload" && (
            <div className="space-y-6 p-1">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer space-y-3 block">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Clique para selecionar um arquivo CSV</p>
                    <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                  </div>
                </label>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Formato esperado do CSV:</p>
                <p className="text-xs text-muted-foreground">
                  Nome (obrigatório), Email, Telefone, CPF, Data de Nascimento, Endereço, Contato Emergência, Telefone Emergência, Observações
                </p>
                <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Baixar modelo CSV
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && validation && (
            <div className="space-y-4 p-1">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{validation.summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{validation.summary.valid}</p>
                  <p className="text-xs text-muted-foreground">Válidos</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{validation.summary.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{validation.summary.duplicates}</p>
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                </div>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Erros ({validation.errors.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validation.errors.slice(0, 20).map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-destructive/5 rounded p-2">
                        Linha {err.row}: {err.field} — {err.message}
                      </p>
                    ))}
                    {validation.errors.length > 20 && (
                      <p className="text-xs text-muted-foreground">...e mais {validation.errors.length - 20} erros</p>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Avisos ({validation.warnings.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validation.warnings.slice(0, 10).map((w, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-amber-500/5 rounded p-2">
                        Linha {w.row}: {w.field} — {w.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {validation.validRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Prévia dos dados válidos:</p>
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Telefone</th>
                          <th className="px-3 py-2 text-left">CPF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation.validRows.slice(0, 10).map((p, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 font-medium">{p.full_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.email || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.phone || "-"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.cpf || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validation.validRows.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ...e mais {validation.validRows.length - 10} registros
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={reset}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || validation.validRows.length === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importing ? "Importando..." : `Importar ${validation.validRows.length} pacientes`}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && importResult && (
            <div className="space-y-4 p-1 text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold">Importação concluída!</p>
                <p className="text-muted-foreground">
                  {importResult.success} pacientes importados com sucesso
                  {importResult.failed > 0 && `, ${importResult.failed} falharam`}
                </p>
              </div>
              <Button onClick={() => { reset(); onOpenChange(false); }}>
                Fechar
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}